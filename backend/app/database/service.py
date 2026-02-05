from sqlalchemy.orm import Session
from .models import Board, User, Stroke, StrokePoint, Shape, TextObject, Layer, BannedToken, Timeout
from typing import List, Optional, Dict
import time


class DatabaseService:
    """Service layer for database operations"""
    
    @staticmethod
    def create_board(db: Session, board_id: str, admin_id: str) -> Board:
        """Create a new board"""
        board = Board(
            board_id=board_id,
            admin_id=admin_id
        )
        db.add(board)
        
        # Create default layer
        default_layer = Layer(
            layer_id="default",
            board_id=board_id,
            name="Layer 1",
            hidden=False,
            order=0
        )
        db.add(default_layer)
        
        db.commit()
        db.refresh(board)
        return board
    
    @staticmethod
    def get_board(db: Session, board_id: str) -> Optional[Board]:
        """Get board by ID"""
        return db.query(Board).filter(Board.board_id == board_id, Board.is_active == True).first()
    
    @staticmethod
    def add_user(db: Session, user_id: str, board_id: str, nickname: str, role: str = "user") -> User:
        """Add user to board"""
        user = User(
            user_id=user_id,
            board_id=board_id,
            nickname=nickname,
            role=role,
            connected=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def get_board_users(db: Session, board_id: str, connected_only: bool = True) -> List[User]:
        """Get all users for a board"""
        query = db.query(User).filter(User.board_id == board_id)
        if connected_only:
            query = query.filter(User.connected == True)
        return query.all()
    
    @staticmethod
    def disconnect_user(db: Session, user_id: str, board_id: str):
        """Mark user as disconnected"""
        user = db.query(User).filter(User.user_id == user_id, User.board_id == board_id).first()
        if user:
            user.connected = False
            db.commit()
    
    @staticmethod
    def update_user_cursor(db: Session, user_id: str, board_id: str, x: float, y: float, tool: str):
        """Update user cursor position and active tool"""
        user = db.query(User).filter(User.user_id == user_id, User.board_id == board_id).first()
        if user:
            user.cursor_x = x
            user.cursor_y = y
            user.active_tool = tool
            db.commit()
    
    @staticmethod
    def add_stroke(db: Session, stroke_id: str, board_id: str, user_id: str, layer_id: str,
                   brush_type: str, color: str, width: float) -> Stroke:
        """Add a new stroke"""
        stroke = Stroke(
            stroke_id=stroke_id,
            board_id=board_id,
            user_id=user_id,
            layer_id=layer_id,
            brush_type=brush_type,
            color=color,
            width=width
        )
        db.add(stroke)
        db.commit()
        db.refresh(stroke)
        return stroke
    
    @staticmethod
    def add_stroke_points(db: Session, stroke_id: str, points: List[Dict]):
        """Add points to a stroke"""
        existing_count = db.query(StrokePoint).filter(StrokePoint.stroke_id == stroke_id).count()
        
        for i, point in enumerate(points):
            stroke_point = StrokePoint(
                stroke_id=stroke_id,
                x=point["x"],
                y=point["y"],
                pressure=point.get("pressure", 0.5),
                timestamp=point.get("timestamp", time.time()),
                point_order=existing_count + i
            )
            db.add(stroke_point)
        
        db.commit()
    
    @staticmethod
    def add_shape(db: Session, shape_id: str, board_id: str, shape_data: Dict) -> Shape:
        """Add a new shape"""
        shape = Shape(
            shape_id=shape_id,
            board_id=board_id,
            user_id=shape_data["user_id"],
            layer_id=shape_data["layer_id"],
            type=shape_data["type"],
            start_x=shape_data["start_x"],
            start_y=shape_data["start_y"],
            end_x=shape_data["end_x"],
            end_y=shape_data["end_y"],
            color=shape_data["color"],
            stroke_width=shape_data["stroke_width"]
        )
        db.add(shape)
        db.commit()
        db.refresh(shape)
        return shape
    
    @staticmethod
    def add_text(db: Session, text_id: str, board_id: str, text_data: Dict) -> TextObject:
        """Add a new text object"""
        text_obj = TextObject(
            text_id=text_id,
            board_id=board_id,
            user_id=text_data["user_id"],
            layer_id=text_data["layer_id"],
            text=text_data["text"],
            x=text_data["x"],
            y=text_data["y"],
            color=text_data["color"],
            font_size=text_data.get("font_size", 16),
            font_family=text_data.get("font_family", "Arial")
        )
        db.add(text_obj)
        db.commit()
        db.refresh(text_obj)
        return text_obj
    
    @staticmethod
    def delete_object(db: Session, board_id: str, object_id: str) -> bool:
        """Delete an object (stroke, shape, or text)"""
        # Try deleting from each table
        deleted = False
        
        # Delete stroke
        stroke = db.query(Stroke).filter(Stroke.stroke_id == object_id, Stroke.board_id == board_id).first()
        if stroke:
            db.delete(stroke)
            deleted = True
        
        # Delete shape
        shape = db.query(Shape).filter(Shape.shape_id == object_id, Shape.board_id == board_id).first()
        if shape:
            db.delete(shape)
            deleted = True
        
        # Delete text
        text = db.query(TextObject).filter(TextObject.text_id == object_id, TextObject.board_id == board_id).first()
        if text:
            db.delete(text)
            deleted = True
        
        if deleted:
            db.commit()
        
        return deleted
    
    @staticmethod
    def get_board_state(db: Session, board_id: str) -> Dict:
        """Get complete board state"""
        board = DatabaseService.get_board(db, board_id)
        if not board:
            return None
        
        # Get users
        users = DatabaseService.get_board_users(db, board_id, connected_only=True)
        
        # Get strokes with points
        strokes = db.query(Stroke).filter(Stroke.board_id == board_id).all()
        strokes_data = []
        for stroke in strokes:
            points = db.query(StrokePoint).filter(
                StrokePoint.stroke_id == stroke.stroke_id
            ).order_by(StrokePoint.point_order).all()
            
            strokes_data.append({
                "id": stroke.stroke_id,
                "user_id": stroke.user_id,
                "layer_id": stroke.layer_id,
                "brush_type": stroke.brush_type,
                "color": stroke.color,
                "width": stroke.width,
                "points": [
                    {
                        "x": p.x,
                        "y": p.y,
                        "pressure": p.pressure,
                        "timestamp": p.timestamp
                    } for p in points
                ],
                "created_at": stroke.created_at
            })
        
        # Get shapes
        shapes = db.query(Shape).filter(Shape.board_id == board_id).all()
        shapes_data = [
            {
                "id": s.shape_id,
                "user_id": s.user_id,
                "type": s.type,
                "start_x": s.start_x,
                "start_y": s.start_y,
                "end_x": s.end_x,
                "end_y": s.end_y,
                "color": s.color,
                "stroke_width": s.stroke_width,
                "layer_id": s.layer_id,
                "created_at": s.created_at
            } for s in shapes
        ]
        
        # Get texts
        texts = db.query(TextObject).filter(TextObject.board_id == board_id).all()
        texts_data = [
            {
                "id": t.text_id,
                "user_id": t.user_id,
                "text": t.text,
                "x": t.x,
                "y": t.y,
                "color": t.color,
                "layer_id": t.layer_id,
                "font_size": t.font_size,
                "font_family": t.font_family,
                "created_at": t.created_at
            } for t in texts
        ]
        
        # Get layers
        layers = db.query(Layer).filter(Layer.board_id == board_id).order_by(Layer.order).all()
        layers_data = [
            {
                "id": l.layer_id,
                "name": l.name,
                "hidden": l.hidden,
                "order": l.order
            } for l in layers
        ]
        
        # Calculate object count
        object_count = len(strokes) + len(shapes) + len(texts)
        
        # Check if admin is online
        admin_online = any(u.user_id == board.admin_id and u.connected for u in users)
        
        return {
            "board_id": board.board_id,
            "users": [
                {
                    "id": u.user_id,
                    "nickname": u.nickname,
                    "role": u.role,
                    "cursor_x": u.cursor_x,
                    "cursor_y": u.cursor_y,
                    "active_tool": u.active_tool,
                    "color": u.color,
                    "connected_at": u.connected_at
                } for u in users
            ],
            "strokes": strokes_data,
            "shapes": shapes_data,
            "texts": texts_data,
            "layers": layers_data,
            "object_count": object_count,
            "max_objects": board.max_objects,
            "max_users": board.max_users,
            "admin_online": admin_online,
            "admin_disconnected_at": board.admin_disconnected_at,
            "created_at": board.created_at
        }
    
    @staticmethod
    def is_user_banned(db: Session, board_id: str, token: str) -> bool:
        """Check if a token is banned"""
        return db.query(BannedToken).filter(
            BannedToken.board_id == board_id,
            BannedToken.token == token
        ).first() is not None
    
    @staticmethod
    def is_user_timed_out(db: Session, board_id: str, user_id: str) -> bool:
        """Check if a user is timed out"""
        timeout = db.query(Timeout).filter(
            Timeout.board_id == board_id,
            Timeout.user_id == user_id,
            Timeout.timeout_until > time.time()
        ).first()
        return timeout is not None
    
    @staticmethod
    def update_admin_disconnect(db: Session, board_id: str, disconnected_at: Optional[float]):
        """Update admin disconnect timestamp"""
        board = DatabaseService.get_board(db, board_id)
        if board:
            board.admin_disconnected_at = disconnected_at
            db.commit()
    
    @staticmethod
    def deactivate_board(db: Session, board_id: str):
        """Deactivate a board (soft delete)"""
        board = DatabaseService.get_board(db, board_id)
        if board:
            board.is_active = False
            db.commit()
    
    @staticmethod
    def get_object_count(db: Session, board_id: str) -> int:
        """Get total object count for a board"""
        stroke_count = db.query(Stroke).filter(Stroke.board_id == board_id).count()
        shape_count = db.query(Shape).filter(Shape.board_id == board_id).count()
        text_count = db.query(TextObject).filter(TextObject.board_id == board_id).count()
        return stroke_count + shape_count + text_count