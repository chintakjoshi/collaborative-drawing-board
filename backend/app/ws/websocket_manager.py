# websocket_manager.py - UPDATED VERSION
import asyncio
import secrets
import string
import time
from typing import Dict, List, Optional
from fastapi import WebSocket
from app.database import get_db, DatabaseService
from app.database.models import User, UserToken
from app.ws.connection_manager import ConnectionManager


class WebSocketManager:
    def __init__(self):
        pass
                
    async def generate_join_code(self) -> str:
        """Generate a 6-character alphanumeric code"""
        alphabet = string.ascii_uppercase + string.digits
        
        for db in get_db():
            try:
                while True:
                    code = ''.join(secrets.choice(alphabet) for _ in range(6))
                    if not DatabaseService.get_board(db, code):
                        return code
            finally:
                db.close()
        return None
        
    async def create_board(self, ws: WebSocket, client_ip: str = None, user_agent: str = None) -> Optional[dict]:
        """Create a new board and return admin info"""
        board_id = await self.generate_join_code()
        if not board_id:
            return None
            
        admin_id = secrets.token_urlsafe(16)
        
        for db in get_db():
            try:
                # Create board in database
                board = DatabaseService.create_board(db, board_id, admin_id)
                
                # Generate admin nickname
                admin_nickname = f"Admin{board_id[:4]}"
                
                # Add admin user to database
                DatabaseService.add_user(db, admin_id, board_id, admin_nickname, role="admin")
                
                # Create token for admin
                admin_token = DatabaseService.create_user_token(db, admin_id, board_id)
                
                # Add active connection
                websocket_id = f"ws_{int(time.time() * 1000)}"
                DatabaseService.add_active_connection(
                    db, board_id, admin_id, websocket_id, client_ip, user_agent
                )
                
                # Update connection state
                DatabaseService.update_connection_state(db, board_id, admin_id)
                
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
            except Exception as e:
                print(f"Error creating board: {e}")
                import traceback
                traceback.print_exc()
                return None
            finally:
                db.close()
        return None

    async def join_board(self, board_id: str, ws: WebSocket, user_token: str = None, client_ip: str = None, user_agent: str = None) -> Optional[dict]:
        """Join existing board as user OR rejoin with token"""
        for db in get_db():
            try:
                # Check if board exists
                board = DatabaseService.get_board(db, board_id)
                if not board:
                    return None
                
                user_id = None
                nickname = None
                role = "user"
                is_rejoining = False
                
                # If token provided, try to validate
                if user_token:
                    validated_user_id = DatabaseService.validate_user_token(db, user_token, board_id)
                    if validated_user_id:
                        # Valid token - user is rejoining
                        user_id = validated_user_id
                        is_rejoining = True
                        # Get user info from database
                        from app.database.models import User
                        user = db.query(User).filter(
                            User.user_id == user_id,
                            User.board_id == board_id
                        ).first()
                        if user:
                            nickname = user.nickname
                            role = user.role
                            # Mark as connected
                            user.connected = True
                            db.commit()
                        pass
                
                # If not rejoining, create new user
                if not user_id:
                    # Check if board is full (connected users)
                    connected_users = [u for u in board.users if u.connected]  # Use relationship
                    if len(connected_users) >= board.max_users:
                        return {"error": "full"}
                    
                    # Generate new user info
                    user_id = secrets.token_urlsafe(16)
                    nickname = f"User{len(connected_users) + 1}"
                    role = "user"
                    
                    # Add new user to database
                    DatabaseService.add_user(db, user_id, board_id, nickname, role="user")
                
                # Generate token if new user, or reuse if rejoining
                if is_rejoining:
                    token_to_send = user_token
                else:
                    token_to_send = DatabaseService.create_user_token(db, user_id, board_id)
                
                # Add active connection
                websocket_id = f"ws_{int(time.time() * 1000)}"
                DatabaseService.add_active_connection(
                    db, board_id, user_id, websocket_id, client_ip, user_agent
                )
                
                # Update connection state
                DatabaseService.update_connection_state(db, board_id, user_id)

                if user_id == board.admin_id:
                    DatabaseService.cancel_admin_timer(db, board_id)
                
                # Get full board state
                board_state = DatabaseService.get_board_state(db, board_id)
                
                return {
                    "board_id": board_id,
                    "user_id": user_id,
                    "token": token_to_send,
                    "nickname": nickname,
                    "role": role,
                    "board_state": board_state
                }
            except Exception as e:
                print(f"❌ Error joining board: {e}")
                import traceback
                traceback.print_exc()
                return None
            finally:
                db.close()
        return None
        
    async def handle_drawing(self, board_id: str, user_id: str, data: dict, 
                            conn_manager: ConnectionManager):
        """Handle all drawing and interaction events"""
        for db in get_db():
            try:
                # Verify board exists
                board = DatabaseService.get_board(db, board_id)
                if not board:
                    return
                    
                # Update connection heartbeat
                DatabaseService.update_connection_heartbeat(db, board_id, user_id)
                
                # Update board activity
                DatabaseService.update_board_activity(db, board_id)
                
                event_type = data.get("type")
                
                # ============= RATE LIMITING =============
                if event_type == "stroke_points":
                    points = len(data.get("points", []))
                    if not DatabaseService.check_rate_limit(db, user_id, board_id, "draw", points):
                        await conn_manager.send_to_user(board_id, user_id, {
                            "type": "rate_limit_warning",
                            "message": "Slow down! You're sending too many points."
                        })
                        return
                elif event_type == "cursor_update":
                    if not DatabaseService.check_rate_limit(db, user_id, board_id, "cursor", 1):
                        return
                
                # ============= STROKE EVENTS =============
                if event_type == "stroke_start":
                    stroke_id = data.get("stroke_id")
                    stroke_data = data.get("stroke")
                    
                    # Check object limit
                    if board.object_count >= board.max_objects:
                        await conn_manager.send_to_user(board_id, user_id, {
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
                    
                    # Increment object count
                    DatabaseService.increment_object_count(db, board_id)
                    
                    await conn_manager.broadcast_to_board(board_id, {
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
                    
                    # Add points to database
                    DatabaseService.add_stroke_points(db, stroke_id, points_data)
                    
                    await conn_manager.broadcast_to_board(board_id, {
                        "type": "stroke_points",
                        "user_id": user_id,
                        "stroke_id": stroke_id,
                        "points": points_data,
                        "timestamp": time.time()
                    }, exclude_user=user_id)
                    
                elif event_type == "stroke_end":
                    stroke_id = data.get("stroke_id")
                    await conn_manager.broadcast_to_board(board_id, {
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
                    if board.object_count >= board.max_objects:
                        await conn_manager.send_to_user(board_id, user_id, {
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
                    
                    # Increment object count
                    DatabaseService.increment_object_count(db, board_id)
                    
                    await conn_manager.broadcast_to_board(board_id, {
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
                    if board.object_count >= board.max_objects:
                        await conn_manager.send_to_user(board_id, user_id, {
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
                    
                    # Increment object count
                    DatabaseService.increment_object_count(db, board_id)
                    
                    await conn_manager.broadcast_to_board(board_id, {
                        "type": "text_create",
                        "text_id": text_id,
                        "user_id": user_id,
                        "text": text_dict,
                        "timestamp": time.time()
                    })
                        
                # ============= CURSOR EVENTS =============
                elif event_type == "cursor_update":
                    x = data.get("x", 0)
                    y = data.get("y", 0)
                    tool = data.get("tool", "pen")
                    
                    # Update in database
                    DatabaseService.update_connection_state(db, board_id, user_id, x, y, tool)
                    
                    await conn_manager.broadcast_to_board(board_id, {
                        "type": "cursor_update",
                        "user_id": user_id,
                        "x": x,
                        "y": y,
                        "tool": tool,
                        "timestamp": time.time()
                    }, exclude_user=user_id)
                    
                # ============= ADMIN ACTIONS =============
                elif event_type == "admin_kick":
                    # Check if user is admin
                    user = db.query(User).filter(
                        User.user_id == user_id,
                        User.board_id == board_id,
                        User.role == "admin"
                    ).first()
                    
                    if user:
                        target_user_id = data.get("user_id")
                        await self._kick_user(board_id, target_user_id, user_id, conn_manager)
                        
                elif event_type == "admin_ban":
                    user = db.query(User).filter(
                        User.user_id == user_id,
                        User.board_id == board_id,
                        User.role == "admin"
                    ).first()
                    
                    if user:
                        target_user_id = data.get("user_id")
                        await self._ban_user(board_id, target_user_id, user_id, conn_manager, db)
                        
                elif event_type == "admin_end_session":
                    user = db.query(User).filter(
                        User.user_id == user_id,
                        User.board_id == board_id,
                        User.role == "admin"
                    ).first()
                    
                    if user:
                        await self._end_session(board_id, user_id, conn_manager, db)
            finally:
                db.close()
                    
    async def disconnect(self, board_id: str, user_id: str):
        """Handle user disconnection"""
        for db in get_db():
            try:
                # Mark user as disconnected in database
                DatabaseService.disconnect_user(db, user_id, board_id)
                
                # Remove active connection
                DatabaseService.remove_active_connection(db, board_id, user_id)
                
                # Get board to check if it's admin
                board = DatabaseService.get_board(db, board_id)
                if board and user_id == board.admin_id:
                    # Admin disconnected - create timer
                    DatabaseService.create_admin_timer(db, board_id)
            finally:
                db.close()

    async def _kick_user(self, board_id: str, target_user_id: str, admin_id: str,
                        conn_manager: ConnectionManager):
        """Kick a user from the board"""
        # Send kick message to target user
        await conn_manager.send_to_user(board_id, target_user_id, {
            "type": "kicked",
            "reason": "kicked_by_admin",
            "admin_id": admin_id,
            "timestamp": time.time()
        })
        
        # Disconnect the user
        await self.disconnect(board_id, target_user_id)
        
        # Notify others
        await conn_manager.broadcast_to_board(board_id, {
            "type": "user_kicked",
            "user_id": target_user_id,
            "admin_id": admin_id,
            "timestamp": time.time()
        })

    async def _ban_user(self, board_id: str, target_user_id: str, admin_id: str,
                       conn_manager: ConnectionManager, db):
        """Ban a user from the board"""
        # Get user's token and ban it
        user_tokens = db.query(UserToken).filter(
            UserToken.user_id == target_user_id,
            UserToken.board_id == board_id
        ).all()
        
        for token in user_tokens:
            DatabaseService.revoke_user_token(db, token.token)
        
        # Kick the user
        await self._kick_user(board_id, target_user_id, admin_id, conn_manager)
        
        # Notify others
        await conn_manager.broadcast_to_board(board_id, {
            "type": "user_banned",
            "user_id": target_user_id,
            "admin_id": admin_id,
            "timestamp": time.time()
        })

    async def _end_session(self, board_id: str, admin_id: str,
                          conn_manager: ConnectionManager, db):
        """End session for all users"""
        # Get all active users
        active_users = DatabaseService.get_active_users(db, board_id)
        
        # Send end session message to all
        for user_id in active_users:
            if user_id != admin_id:
                await conn_manager.send_to_user(board_id, user_id, {
                    "type": "session_ended",
                    "reason": "ended_by_admin",
                    "admin_id": admin_id,
                    "timestamp": time.time()
                })
        
        # Deactivate board
        DatabaseService.deactivate_board(db, board_id)
        
        # Clear all active connections
        from app.database.models import ActiveConnection
        db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id
        ).delete()
        
        db.commit()
