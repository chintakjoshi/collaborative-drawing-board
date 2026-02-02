import asyncio
import json
import secrets
import string
import time
from typing import Dict, List, Optional, Set
from dataclasses import asdict
from fastapi import WebSocket
from ..core.board_room import BoardRoom, UserRole, Stroke, Point, ToolType
from ..core.shapes import Shape, TextObject, EraserEngine, GeometryUtils


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.boards: Dict[str, BoardRoom] = {}
        self.connection_tokens: Dict[str, str] = {}
        self.eraser_engine = EraserEngine()
        
    async def generate_join_code(self) -> str:
        """Generate a 6-character alphanumeric code"""
        alphabet = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(secrets.choice(alphabet) for _ in range(6))
            if code not in self.boards:
                return code
                
    async def create_board(self, ws: WebSocket) -> dict:
        """Create a new board and return admin info"""
        board_id = await self.generate_join_code()
        admin_id = secrets.token_urlsafe(16)  # Use secure random ID
        admin_token = secrets.token_urlsafe(32)
        
        # Create board
        board = BoardRoom(board_id, admin_id)
        self.boards[board_id] = board
        
        # Initialize connections dict for this board
        self.active_connections[board_id] = {}
        
        # Generate admin nickname
        admin_nickname = f"Admin{board_id[:4]}"
        board.add_user(admin_id, admin_nickname, UserRole.ADMIN)
        
        # Store token
        self.connection_tokens[admin_id] = admin_token
        
        return {
            "board_id": board_id,
            "user_id": admin_id,
            "token": admin_token,
            "nickname": admin_nickname,
            "role": "admin",
            "board_state": board.to_dict()
        }
        
    async def join_board(self, board_id: str, ws: WebSocket, token: str = None) -> Optional[dict]:
        """Join existing board as user"""
        if board_id not in self.boards:
            return None
            
        board = self.boards[board_id]
        
        # Check if token is banned
        if token and token in board.banned_tokens:
            return {"error": "banned"}
        
        # Generate user info
        user_id = secrets.token_urlsafe(16)  # Use secure random ID
        nickname = f"User{len(board.users) + 1}"
        
        # Try to add user
        if not board.add_user(user_id, nickname):
            # Check specific reason
            if len(board.users) >= board.max_users:
                return {"error": "full"}
            if user_id in board.timeouts and board.timeouts[user_id] > time.time():
                return {"error": "timeout"}
            return None
            
        # Generate token for this user
        user_token = secrets.token_urlsafe(32)
        self.connection_tokens[user_id] = user_token
        
        # Store connection
        self.active_connections[board_id][user_id] = ws
        
        # Notify others
        await self.broadcast_to_board(board_id, {
            "type": "user_joined",
            "user_id": user_id,
            "nickname": nickname,
            "timestamp": time.time()
        }, exclude_user=user_id)
        
        return {
            "board_id": board_id,
            "user_id": user_id,
            "token": user_token,
            "nickname": nickname,
            "role": "user",
            "board_state": board.to_dict()
        }
        
    async def handle_drawing(self, board_id: str, user_id: str, data: dict):
        """Handle all drawing and interaction events"""
        board = self.boards.get(board_id)
        if not board or user_id not in board.users:
            return
            
        event_type = data.get("type")
        
        # ============= STROKE EVENTS =============
        if event_type == "stroke_start":
            stroke_id = data.get("stroke_id")
            stroke_data = data.get("stroke")
            
            stroke = Stroke(
                id=stroke_id,
                user_id=user_id,
                layer_id=stroke_data.get("layer_id", "default"),
                brush_type=stroke_data.get("brush_type", "pen"),
                color=stroke_data.get("color", "#000000"),
                width=stroke_data.get("width", 5),
                points=[],
                created_at=time.time()
            )
            
            if board.add_stroke(stroke):
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_start",
                    "stroke_id": stroke_id,
                    "user_id": user_id,
                    "stroke": {
                        "layer_id": stroke.layer_id,
                        "brush_type": stroke.brush_type,
                        "color": stroke.color,
                        "width": stroke.width
                    },
                    "timestamp": time.time()
                }, exclude_user=user_id)
            else:
                # Send error - object limit reached
                await self._send_to_user(board_id, user_id, {
                    "type": "error",
                    "message": "Object limit reached (5000 maximum)"
                })
                
        elif event_type == "stroke_points":
            stroke_id = data.get("stroke_id")
            points_data = data.get("points", [])
            
            # Rate limit check
            if not board.check_rate_limit(user_id, len(points_data)):
                # Send warning
                await self._send_to_user(board_id, user_id, {
                    "type": "rate_limit_warning",
                    "message": "Slow down! You're sending too many points."
                })
                return
            
            # Add points to the stroke in board state
            if stroke_id and stroke_id in board.strokes:
                stroke = board.strokes[stroke_id]
                stroke.points.extend([
                    Point(x=p["x"], y=p["y"], pressure=p.get("pressure", 0.5), timestamp=p.get("timestamp", time.time()))
                    for p in points_data
                ])
            
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
            
            # Create shape dictionary
            shape_dict = {
                "id": shape_id,
                "user_id": user_id,
                "type": shape_data.get("type"),
                "start_x": shape_data.get("startX", shape_data.get("start_x")),
                "start_y": shape_data.get("startY", shape_data.get("start_y")),
                "end_x": shape_data.get("endX", shape_data.get("end_x")),
                "end_y": shape_data.get("endY", shape_data.get("end_y")),
                "color": shape_data.get("color", "#000000"),
                "stroke_width": shape_data.get("strokeWidth", shape_data.get("stroke_width", 5)),
                "layer_id": shape_data.get("layer_id", "default"),
                "created_at": time.time()
            }
            
            if board.add_shape(shape_id, shape_dict):
                await self.broadcast_to_board(board_id, {
                    "type": "shape_create",
                    "shape_id": shape_id,
                    "user_id": user_id,
                    "shape": shape_dict,
                    "timestamp": time.time()
                })
            else:
                await self._send_to_user(board_id, user_id, {
                    "type": "error",
                    "message": "Object limit reached (5000 maximum)"
                })
                
        # ============= TEXT EVENTS =============
        elif event_type == "text_create":
            text_data = data.get("text")
            text_id = f"text_{int(time.time() * 1000)}_{user_id}"
            
            # Create text dictionary
            text_dict = {
                "id": text_id,
                "user_id": user_id,
                "text": text_data.get("text", ""),
                "x": text_data.get("x", 0),
                "y": text_data.get("y", 0),
                "color": text_data.get("color", "#000000"),
                "layer_id": text_data.get("layer_id", "default"),
                "font_size": text_data.get("font_size", 16),
                "font_family": text_data.get("font_family", "Arial"),
                "created_at": time.time()
            }
            
            if board.add_text(text_id, text_dict):
                await self.broadcast_to_board(board_id, {
                    "type": "text_create",
                    "text_id": text_id,
                    "user_id": user_id,
                    "text": text_dict,
                    "timestamp": time.time()
                })
            else:
                await self._send_to_user(board_id, user_id, {
                    "type": "error",
                    "message": "Object limit reached (5000 maximum)"
                })
                
        # ============= ERASER EVENTS =============
        elif event_type == "erase_path":
            eraser_points = data.get("points", [])
            
            # Find and delete strokes that intersect with eraser path
            strokes_to_delete = []
            for stroke_id, stroke in list(board.strokes.items()):
                for eraser_point in eraser_points:
                    for stroke_point in stroke.points:
                        if GeometryUtils.point_distance(
                            stroke_point.x, stroke_point.y,
                            eraser_point["x"], eraser_point["y"]
                        ) <= self.eraser_engine.eraser_width:
                            strokes_to_delete.append(stroke_id)
                            break
                    if stroke_id in strokes_to_delete:
                        break
            
            # Broadcast deletions
            for stroke_id in strokes_to_delete:
                await self.broadcast_to_board(board_id, {
                    "type": "object_delete",
                    "object_id": stroke_id,
                    "object_type": "stroke",
                    "user_id": user_id,
                    "timestamp": time.time()
                })
                # Remove from board state using the new delete method
                board.delete_object(stroke_id)
                    
        # ============= CURSOR EVENTS =============
        elif event_type == "cursor_update":
            user = board.users.get(user_id)
            if user:
                user.cursor_x = data.get("x", 0)
                user.cursor_y = data.get("y", 0)
                user.active_tool = data.get("tool", "pen")
                
                await self.broadcast_to_board(board_id, {
                    "type": "cursor_update",
                    "user_id": user_id,
                    "x": user.cursor_x,
                    "y": user.cursor_y,
                    "tool": user.active_tool,
                    "timestamp": time.time()
                }, exclude_user=user_id)
    
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
                    # Connection might be dead, will be cleaned up on disconnect
                    
    async def disconnect(self, board_id: str, user_id: str):
        """Handle user disconnection"""
        if board_id in self.boards:
            board = self.boards[board_id]
            board.remove_user(user_id)
            
        if board_id in self.active_connections and user_id in self.active_connections[board_id]:
            del self.active_connections[board_id][user_id]
            
        # Notify others
        await self.broadcast_to_board(board_id, {
            "type": "user_left",
            "user_id": user_id,
            "timestamp": time.time()
        })
        
        # Check if board is empty
        if board_id in self.boards and len(self.boards[board_id].users) == 0:
            # Optional: cleanup empty boards after some time
            pass
        
    def cleanup_board(self, board_id: str):
        """Cleanup board after session ends"""
        if board_id in self.boards:
            del self.boards[board_id]
        if board_id in self.active_connections:
            del self.active_connections[board_id]