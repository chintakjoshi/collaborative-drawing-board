import asyncio
import json
import secrets
import string
import time
from typing import Dict, List, Optional, Set
from ..database.models import User
from fastapi import WebSocket
from ..database import get_db, DatabaseService
from ..core.shapes import EraserEngine, GeometryUtils


class WebSocketManager:
    def __init__(self):
        # Only keep WebSocket connections in memory
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.connection_tokens: Dict[str, str] = {}
        self.eraser_engine = EraserEngine()
        
        # Rate limiting (in memory is fine for this)
        self.user_rates: Dict[str, Dict] = {}

        # Admin disconnect timers
        self.admin_timers: Dict[str, asyncio.Task] = {}
        
    async def generate_join_code(self) -> str:
        """Generate a 6-character alphanumeric code"""
        alphabet = string.ascii_uppercase + string.digits
        db = get_db()
        try:
            while True:
                code = ''.join(secrets.choice(alphabet) for _ in range(6))
                # Check if code already exists in database
                if not DatabaseService.get_board(db, code):
                    return code
        finally:
            db.close()
                
    async def create_board(self, ws: WebSocket) -> dict:
        """Create a new board and return admin info"""
        board_id = await self.generate_join_code()
        admin_id = secrets.token_urlsafe(16)
        admin_token = secrets.token_urlsafe(32)
        
        db = get_db()
        try:
            # Create board in database
            board = DatabaseService.create_board(db, board_id, admin_id)
            
            # Initialize connections dict for this board
            self.active_connections[board_id] = {}
            
            # Generate admin nickname
            admin_nickname = f"Admin{board_id[:4]}"
            
            # Add admin user to database
            DatabaseService.add_user(db, admin_id, board_id, admin_nickname, role="admin")
            
            # Store token
            self.connection_tokens[admin_id] = admin_token
            
            # Get full board state
            board_state = DatabaseService.get_board_state(db, board_id)
            
            return {
                "board_id": board_id,
                "user_id": admin_id,
                "token": admin_token,
                "nickname": admin_nickname,
                "role": "admin",
                "board_state": board_state
            }
        finally:
            db.close()
        
    async def join_board(self, board_id: str, ws: WebSocket, user_token: str = None) -> Optional[dict]:
        """Join existing board as user OR rejoin as admin"""
        db = get_db()
        try:
            # Check if board exists
            board = DatabaseService.get_board(db, board_id)
            if not board:
                return None
            
            # Check if this is admin trying to rejoin
            # Admin is stored in localStorage with their user_id
            saved_user_id = user_token  # Frontend should pass the saved user_id as token when reconnecting
            
            is_admin_rejoining = False
            user_id = None
            nickname = None
            role = "user"
            
            # Check if there's an existing user record for this connection
            existing_users = DatabaseService.get_board_users(db, board_id, connected_only=False)
            
            # Try to find if this is admin reconnecting
            for existing_user in existing_users:
                if existing_user.user_id == board.admin_id and existing_user.user_id in self.connection_tokens:
                    # This is the admin trying to reconnect
                    is_admin_rejoining = True
                    user_id = existing_user.user_id
                    nickname = existing_user.nickname
                    role = "admin"
                    print(f"🔄 Admin rejoining board {board_id}: {user_id}")
                    break
            
            if not is_admin_rejoining:
                # New user joining (not admin reconnect)
                
                # Check if token is banned
                if user_token and DatabaseService.is_user_banned(db, board_id, user_token):
                    return {"error": "banned"}
                
                # Get current CONNECTED user count
                connected_users = [u for u in existing_users if u.connected]
                
                # Check if board is full
                if len(connected_users) >= board.max_users:
                    return {"error": "full"}
                
                # Generate new user info
                user_id = secrets.token_urlsafe(16)
                nickname = f"User{len(existing_users) + 1}"
                role = "user"
                
                # Check if user is timed out
                if DatabaseService.is_user_timed_out(db, board_id, user_id):
                    return {"error": "timeout"}
                
                # Add new user to database
                DatabaseService.add_user(db, user_id, board_id, nickname, role="user")
                print(f"👤 New user joining board {board_id}: {nickname} ({user_id})")
            else:
                # Admin is rejoining - mark them as connected again
                db_user = db.query(User).filter(User.user_id == user_id, User.board_id == board_id).first()
                if db_user:
                    db_user.connected = True
                    db.commit()
                
                # Cancel admin disconnect timer
                await self._cancel_admin_timer(board_id, db)
            
            # Generate/reuse token for this user
            user_token_to_send = self.connection_tokens.get(user_id, secrets.token_urlsafe(32))
            self.connection_tokens[user_id] = user_token_to_send
            
            # Store connection
            if board_id not in self.active_connections:
                self.active_connections[board_id] = {}
            self.active_connections[board_id][user_id] = ws
            
            # Notify others (but not on admin rejoin to avoid spam)
            if not is_admin_rejoining:
                await self.broadcast_to_board(board_id, {
                    "type": "user_joined",
                    "user_id": user_id,
                    "nickname": nickname,
                    "timestamp": time.time()
                }, exclude_user=user_id)
            
            # Get full board state
            board_state = DatabaseService.get_board_state(db, board_id)
            
            return {
                "board_id": board_id,
                "user_id": user_id,
                "token": user_token_to_send,
                "nickname": nickname,
                "role": role,
                "board_state": board_state
            }
        finally:
            db.close()
        
    def check_rate_limit(self, user_id: str, points: int = 1) -> bool:
        """Check rate limiting (kept in memory)"""
        now = time.time()
        if user_id not in self.user_rates:
            self.user_rates[user_id] = {
                "points": 0,
                "reset_time": now + 60
            }
            
        user_rate = self.user_rates[user_id]
        
        if now > user_rate["reset_time"]:
            user_rate["points"] = 0
            user_rate["reset_time"] = now + 60
            
        if user_rate["points"] + points > 1000:
            return False
            
        user_rate["points"] += points
        return True
        
    async def handle_drawing(self, board_id: str, user_id: str, data: dict):
        """Handle all drawing and interaction events"""
        db = get_db()
        try:
            # Verify board exists
            board = DatabaseService.get_board(db, board_id)
            if not board:
                return
                
            event_type = data.get("type")
            
            # ============= STROKE EVENTS =============
            if event_type == "stroke_start":
                stroke_id = data.get("stroke_id")
                stroke_data = data.get("stroke")
                
                # Check object limit
                object_count = DatabaseService.get_object_count(db, board_id)
                if object_count >= board.max_objects:
                    await self._send_to_user(board_id, user_id, {
                        "type": "error",
                        "message": "Object limit reached (5000 maximum)"
                    })
                    return
                
                # Add stroke to database
                DatabaseService.add_stroke(
                    db,
                    stroke_id=stroke_id,
                    board_id=board_id,
                    user_id=user_id,
                    layer_id=stroke_data.get("layer_id", "default"),
                    brush_type=stroke_data.get("brush_type", "pen"),
                    color=stroke_data.get("color", "#000000"),
                    width=stroke_data.get("width", 5)
                )
                
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_start",
                    "stroke_id": stroke_id,
                    "user_id": user_id,
                    "stroke": {
                        "layer_id": stroke_data.get("layer_id", "default"),
                        "brush_type": stroke_data.get("brush_type", "pen"),
                        "color": stroke_data.get("color", "#000000"),
                        "width": stroke_data.get("width", 5)
                    },
                    "timestamp": time.time()
                }, exclude_user=user_id)
                    
            elif event_type == "stroke_points":
                stroke_id = data.get("stroke_id")
                points_data = data.get("points", [])
                
                # Rate limit check
                if not self.check_rate_limit(user_id, len(points_data)):
                    await self._send_to_user(board_id, user_id, {
                        "type": "rate_limit_warning",
                        "message": "Slow down! You're sending too many points."
                    })
                    return
                
                # Add points to database
                DatabaseService.add_stroke_points(db, stroke_id, points_data)
                
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_points",
                    "user_id": user_id,
                    "stroke_id": stroke_id,
                    "points": points_data,
                    "timestamp": time.time()
                }, exclude_user=user_id)
                
            elif event_type == "stroke_end":
                stroke_id = data.get("stroke_id")
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_end",
                    "stroke_id": stroke_id,
                    "user_id": user_id,
                    "timestamp": time.time()
                }, exclude_user=user_id)
            
            # ============= SHAPE EVENTS =============
            elif event_type == "shape_create":
                shape_data = data.get("shape")
                shape_id = f"shape_{int(time.time() * 1000)}_{user_id}"
                
                # Check object limit
                object_count = DatabaseService.get_object_count(db, board_id)
                if object_count >= board.max_objects:
                    await self._send_to_user(board_id, user_id, {
                        "type": "error",
                        "message": "Object limit reached (5000 maximum)"
                    })
                    return
                
                # Prepare shape data for database
                shape_dict = {
                    "user_id": user_id,
                    "type": shape_data.get("type"),
                    "start_x": shape_data.get("startX", shape_data.get("start_x")),
                    "start_y": shape_data.get("startY", shape_data.get("start_y")),
                    "end_x": shape_data.get("endX", shape_data.get("end_x")),
                    "end_y": shape_data.get("endY", shape_data.get("end_y")),
                    "color": shape_data.get("color", "#000000"),
                    "stroke_width": shape_data.get("strokeWidth", shape_data.get("stroke_width", 5)),
                    "layer_id": shape_data.get("layer_id", "default")
                }
                
                # Add shape to database
                DatabaseService.add_shape(db, shape_id, board_id, shape_dict)
                
                await self.broadcast_to_board(board_id, {
                    "type": "shape_create",
                    "shape_id": shape_id,
                    "user_id": user_id,
                    "shape": {
                        "type": shape_dict["type"],
                        "start_x": shape_dict["start_x"],
                        "start_y": shape_dict["start_y"],
                        "end_x": shape_dict["end_x"],
                        "end_y": shape_dict["end_y"],
                        "color": shape_dict["color"],
                        "stroke_width": shape_dict["stroke_width"],
                        "layer_id": shape_dict["layer_id"]
                    },
                    "timestamp": time.time()
                })
                    
            # ============= TEXT EVENTS =============
            elif event_type == "text_create":
                text_data = data.get("text")
                text_id = f"text_{int(time.time() * 1000)}_{user_id}"
                
                # Check object limit
                object_count = DatabaseService.get_object_count(db, board_id)
                if object_count >= board.max_objects:
                    await self._send_to_user(board_id, user_id, {
                        "type": "error",
                        "message": "Object limit reached (5000 maximum)"
                    })
                    return
                
                # Prepare text data for database
                text_dict = {
                    "user_id": user_id,
                    "text": text_data.get("text", ""),
                    "x": text_data.get("x", 0),
                    "y": text_data.get("y", 0),
                    "color": text_data.get("color", "#000000"),
                    "layer_id": text_data.get("layer_id", "default"),
                    "font_size": text_data.get("font_size", 16),
                    "font_family": text_data.get("font_family", "Arial")
                }
                
                # Add text to database
                DatabaseService.add_text(db, text_id, board_id, text_dict)
                
                await self.broadcast_to_board(board_id, {
                    "type": "text_create",
                    "text_id": text_id,
                    "user_id": user_id,
                    "text": text_dict,
                    "timestamp": time.time()
                })
                    
            # ============= ERASER EVENTS =============
            elif event_type == "erase_path":
                eraser_points = data.get("points", [])
                
                # Get all strokes from database for this board
                # Simple deletion for now (cutting will be implemented later)
                # This is a simplified version - we'll enhance this in Issue #9
                
                # For now, just broadcast the erase event
                # Clients will handle deletion locally, and we'll delete from DB
                # In a real implementation, you'd query strokes and check intersections
                
                # Placeholder: just pass through the erase event
                await self.broadcast_to_board(board_id, {
                    "type": "erase_path",
                    "user_id": user_id,
                    "points": eraser_points,
                    "timestamp": time.time()
                })
                    
            # ============= CURSOR EVENTS =============
            elif event_type == "cursor_update":
                x = data.get("x", 0)
                y = data.get("y", 0)
                tool = data.get("tool", "pen")
                
                # Update in database
                DatabaseService.update_user_cursor(db, user_id, board_id, x, y, tool)
                
                await self.broadcast_to_board(board_id, {
                    "type": "cursor_update",
                    "user_id": user_id,
                    "x": x,
                    "y": y,
                    "tool": tool,
                    "timestamp": time.time()
                }, exclude_user=user_id)
        finally:
            db.close()
    
    async def _send_to_user(self, board_id: str, user_id: str, message: dict):
        """Send message to a specific user"""
        if board_id in self.active_connections and user_id in self.active_connections[board_id]:
            try:
                await self.active_connections[board_id][user_id].send_json(message)
            except Exception as e:
                print(f"Error sending to user {user_id}: {e}")
                
    async def broadcast_to_board(self, board_id: str, message: dict, exclude_user: str = None):
        """Send message to all users in board"""
        if board_id not in self.active_connections:
            return
            
        for user_id, connection in list(self.active_connections[board_id].items()):
            if user_id != exclude_user:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to user {user_id}: {e}")
                    
    async def disconnect(self, board_id: str, user_id: str):
        """Handle user disconnection"""
        db = get_db()
        try:
            # Mark user as disconnected in database
            DatabaseService.disconnect_user(db, user_id, board_id)
            
            # Get board to check if it's admin
            board = DatabaseService.get_board(db, board_id)
            if board and user_id == board.admin_id:
                # Admin disconnected - update timestamp
                DatabaseService.update_admin_disconnect(db, board_id, time.time())
                await self._start_admin_timer(board_id)
            
            # Remove from active connections
            if board_id in self.active_connections and user_id in self.active_connections[board_id]:
                del self.active_connections[board_id][user_id]
                
            # Notify others
            await self.broadcast_to_board(board_id, {
                "type": "user_left",
                "user_id": user_id,
                "timestamp": time.time()
            })
            
            # Clean up empty board connections
            if board_id in self.active_connections and len(self.active_connections[board_id]) == 0:
                del self.active_connections[board_id]
        finally:
            db.close()

    async def _start_admin_timer(self, board_id: str):
        async def timer():
            try:
                await asyncio.sleep(600)

                # After 10 min, clean up board
                self.cleanup_board(board_id)

                await self.broadcast_to_board(board_id, {
                    "type": "session_ended",
                    "reason": "admin_timeout",
                    "timestamp": time.time()
                })

            except asyncio.CancelledError:
                pass

        self.admin_timers[board_id] = asyncio.create_task(timer())


    async def _cancel_admin_timer(self, board_id: str, db):
        """Cancel admin disconnect timer when admin reconnects"""
        # Cancel background timer task
        if board_id in self.admin_timers:
            self.admin_timers[board_id].cancel()
            del self.admin_timers[board_id]
            print(f"⏹️  Admin timer cancelled for board {board_id}")
        
        # Clear disconnect timestamp in database
        DatabaseService.update_admin_disconnect(db, board_id, None)
        
        # Notify all users that admin is back
        await self.broadcast_to_board(board_id, {
            "type": "admin_reconnected",
            "timestamp": time.time()
        })
        
        print(f"✅ Admin reconnected to board {board_id}, timer cancelled and users notified")
        
    def cleanup_board(self, board_id: str):
        """Cleanup board after session ends"""
        db = get_db()
        try:
            # Deactivate board in database
            DatabaseService.deactivate_board(db, board_id)
            
            # Remove from active connections
            if board_id in self.active_connections:
                del self.active_connections[board_id]
        finally:
            db.close()