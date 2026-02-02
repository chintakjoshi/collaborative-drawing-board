import asyncio
import json
import secrets
import string
import time
from typing import Dict, List, Optional, Set
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
        admin_id = str(len(self.boards) + 1)
        admin_token = secrets.token_urlsafe(32)
        
        board = BoardRoom(board_id, admin_id)
        self.boards[board_id] = board
        self.active_connections[board_id] = {}
        
        # Generate admin nickname
        admin_nickname = f"User{admin_id}"
        board.add_user(admin_id, admin_nickname, UserRole.ADMIN)
        
        self.connection_tokens[admin_id] = admin_token
        
        return {
            "board_id": board_id,
            "user_id": admin_id,
            "token": admin_token,
            "nickname": admin_nickname,
            "role": "admin"
        }
        
    async def join_board(self, board_id: str, ws: WebSocket) -> Optional[dict]:
        """Join existing board as user"""
        if board_id not in self.boards:
            return None
            
        board = self.boards[board_id]
        user_id = str(len(board.users) + 1)
        nickname = f"User{user_id}"
        
        if not board.add_user(user_id, nickname):
            return None
            
        # Generate token for this user
        token = secrets.token_urlsafe(32)
        self.connection_tokens[user_id] = token
        
        # Store connection
        self.active_connections[board_id][user_id] = ws
        
        # Notify others
        await self.broadcast_to_board(board_id, {
            "type": "user_joined",
            "user_id": user_id,
            "nickname": nickname,
            "timestamp": asyncio.get_event_loop().time()
        }, exclude_user=user_id)
        
        return {
            "board_id": board_id,
            "user_id": user_id,
            "token": token,
            "nickname": nickname,
            "role": "user",
            "board_state": {
                "users": [{"id": u.id, "nickname": u.nickname} for u in board.users.values()],
                "layers": board.layers,
                "object_count": board.object_count
            }
        }
        
    async def handle_drawing(self, board_id: str, user_id: str, data: dict):
        """Handle drawing events"""
        board = self.boards.get(board_id)
        if not board or user_id not in board.users:
            return
            
        event_type = data.get("type")
        
        if event_type == "stroke_start":
            # Handle new stroke
            stroke_id = data.get("stroke_id")
            stroke_data = data.get("stroke")
            
            stroke = Stroke(
                id=stroke_id,
                user_id=user_id,
                layer_id=stroke_data["layer_id"],
                brush_type=stroke_data["brush_type"],
                color=stroke_data["color"],
                width=stroke_data["width"],
                points=[],
                created_at=asyncio.get_event_loop().time()
            )
            
            if board.add_stroke(stroke):
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_start",
                    "stroke_id": stroke_id,
                    "user_id": user_id,
                    "stroke": stroke_data,
                    "timestamp": asyncio.get_event_loop().time()
                }, exclude_user=user_id)
                
        elif event_type == "stroke_points":
            # Batch of points
            points_data = data.get("points", [])
            points = [Point(x=p["x"], y=p["y"], pressure=p.get("pressure", 0.5)) 
                     for p in points_data]
            
            # Rate limit check
            if not board.check_rate_limit(user_id, len(points)):
                return
                
            await self.broadcast_to_board(board_id, {
                "type": "stroke_points",
                "user_id": user_id,
                "points": points_data,
                "timestamp": asyncio.get_event_loop().time()
            }, exclude_user=user_id)
            
        elif event_type == "cursor_update":
            # Update cursor position
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
                    "timestamp": asyncio.get_event_loop().time()
                }, exclude_user=user_id)
                
    async def broadcast_to_board(self, board_id: str, message: dict, exclude_user: str = None):
        """Send message to all users in board"""
        if board_id not in self.active_connections:
            return
            
        for user_id, connection in self.active_connections[board_id].items():
            if user_id != exclude_user:
                try:
                    await connection.send_json(message)
                except:
                    pass
                    
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
            "timestamp": asyncio.get_event_loop().time()
        })
        
    def cleanup_board(self, board_id: str):
        """Cleanup board after session ends"""
        if board_id in self.boards:
            del self.boards[board_id]
        if board_id in self.active_connections:
            del self.active_connections[board_id]

    async def handle_drawing(self, board_id: str, user_id: str, data: dict):
        """Handle drawing events"""
        board = self.boards.get(board_id)
        if not board or user_id not in board.users:
            return
            
        event_type = data.get("type")
        
        if event_type == "stroke_start":
            stroke_id = data.get("stroke_id")
            stroke_data = data.get("stroke")
            
            stroke = Stroke(
                id=stroke_id,
                user_id=user_id,
                layer_id=stroke_data["layer_id"],
                brush_type=stroke_data["brush_type"],
                color=stroke_data["color"],
                width=stroke_data["width"],
                points=[],
                created_at=time.time()
            )
            
            if board.add_stroke(stroke):
                await self.broadcast_to_board(board_id, {
                    "type": "stroke_start",
                    "stroke_id": stroke_id,
                    "user_id": user_id,
                    "stroke": stroke_data,
                    "timestamp": time.time()
                }, exclude_user=user_id)
                
        elif event_type == "stroke_points":
            points_data = data.get("points", [])
            
            # Rate limit check
            if not board.check_rate_limit(user_id, len(points_data)):
                return
                
            # Add points to the stroke in board state
            stroke_id = data.get("stroke_id")
            if stroke_id and stroke_id in board.strokes:
                stroke = board.strokes[stroke_id]
                stroke.points.extend([
                    Point(x=p["x"], y=p["y"], pressure=p.get("pressure", 0.5))
                    for p in points_data
                ])
            
            await self.broadcast_to_board(board_id, {
                "type": "stroke_points",
                "user_id": user_id,
                "stroke_id": stroke_id,
                "points": points_data,
                "timestamp": time.time()
            }, exclude_user=user_id)
            
        elif event_type == "shape_create":
            shape_data = data.get("shape")
            shape_id = f"shape_{int(time.time() * 1000)}_{user_id}"
            
            shape = Shape(
                id=shape_id,
                user_id=user_id,
                layer_id=shape_data["layer_id"],
                type=shape_data["type"],
                start_x=shape_data["start_x"],
                start_y=shape_data["start_y"],
                end_x=shape_data["end_x"],
                end_y=shape_data["end_y"],
                color=shape_data["color"],
                stroke_width=shape_data["stroke_width"],
                fill_color=shape_data.get("fill_color"),
                created_at=time.time()
            )
            
            if board.add_stroke(shape):  # Reusing add_stroke for now
                await self.broadcast_to_board(board_id, {
                    "type": "shape_create",
                    "shape_id": shape_id,
                    "user_id": user_id,
                    "shape": asdict(shape),
                    "timestamp": time.time()
                })
                
        elif event_type == "text_create":
            text_data = data.get("text")
            text_id = f"text_{int(time.time() * 1000)}_{user_id}"
            
            text_obj = TextObject(
                id=text_id,
                user_id=user_id,
                layer_id=text_data["layer_id"],
                text=text_data["text"],
                x=text_data["x"],
                y=text_data["y"],
                color=text_data["color"],
                font_size=text_data.get("font_size", 16),
                font_family=text_data.get("font_family", "Arial"),
                created_at=time.time()
            )
            
            if board.add_stroke(text_obj):  # Reusing add_stroke for now
                await self.broadcast_to_board(board_id, {
                    "type": "text_create",
                    "text_id": text_id,
                    "user_id": user_id,
                    "text": asdict(text_obj),
                    "timestamp": time.time()
                })
                
        elif event_type == "erase_path":
            eraser_points = data.get("points", [])
            user_strokes = [s for s in board.strokes.values() if s.user_id != user_id]
            
            # Find strokes to cut/delete
            strokes_to_cut = []
            for stroke in user_strokes:
                for eraser_point in eraser_points:
                    for stroke_point in stroke.points:
                        if GeometryUtils.point_distance(
                            stroke_point.x, stroke_point.y,
                            eraser_point["x"], eraser_point["y"]
                        ) <= self.eraser_engine.eraser_width:
                            strokes_to_cut.append(stroke)
                            break
                    if stroke in strokes_to_cut:
                        break
            
            # Broadcast erase events
            for stroke in strokes_to_cut:
                await self.broadcast_to_board(board_id, {
                    "type": "object_delete",
                    "object_id": stroke.id,
                    "object_type": "stroke",
                    "user_id": user_id,
                    "timestamp": time.time()
                })
                # Remove from board state
                if stroke.id in board.strokes:
                    del board.strokes[stroke.id]
                    board.object_count -= 1
                    
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