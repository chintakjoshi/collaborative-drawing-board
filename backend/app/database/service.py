from sqlalchemy.orm import Session
from .models import ActiveConnection, AdminTimer, Board, ConnectionState, RateLimit, User, Stroke, StrokePoint, Shape, TextObject, Layer, BannedToken, Timeout, UserToken
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
        return db.query(Board).filter(Board.board_id == board_id, Board.is_active).first()
    
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
            query = query.filter(User.connected)
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
        
        # Get users - use the relationship defined in Board
        users = board.users
        
        # Get strokes with points
        strokes = board.strokes
        strokes_data = []
        for stroke in strokes:
            points = stroke.points
            
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
        shapes = board.shapes
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
        texts = board.texts
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
        layers = board.layers
        layers_data = [
            {
                "id": layer.layer_id,
                "name": layer.name,
                "hidden": layer.hidden,
                "order": layer.order
            } for layer in layers
        ]
        
        # Check if admin is online
        admin_online = any(u.user_id == board.admin_id and u.connected for u in users)
        
        # Get admin timer if exists
        admin_timer = board.admin_timer_instance
        admin_disconnected_at = admin_timer.admin_disconnected_at if admin_timer else None
        
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
            "object_count": board.object_count,
            "max_objects": board.max_objects,
            "max_users": board.max_users,
            "admin_online": admin_online,
            "admin_disconnected_at": admin_disconnected_at,
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

    @staticmethod
    def create_user_token(db: Session, user_id: str, board_id: str, expires_in: int = None) -> str:
        """Create a new JWT-like token for user"""
        import secrets
        
        token = secrets.token_urlsafe(32)
        expires_at = None
        if expires_in:
            expires_at = time.time() + expires_in
            
        user_token = UserToken(
            user_id=user_id,
            board_id=board_id,
            token=token,
            expires_at=expires_at
        )
        db.add(user_token)
        db.commit()
        return token

    @staticmethod
    def validate_user_token(db: Session, token: str, board_id: str) -> Optional[str]:
        """Validate token and return user_id if valid"""
        user_token = db.query(UserToken).filter(
            UserToken.token == token,
            UserToken.board_id == board_id,
            UserToken.is_revoked.is_(False)
        ).first()
        
        if not user_token:
            return None
            
        # Check expiration
        if user_token.expires_at and user_token.expires_at < time.time():
            return None
            
        return user_token.user_id

    @staticmethod
    def revoke_user_token(db: Session, token: str):
        """Revoke a token (for logout or ban)"""
        user_token = db.query(UserToken).filter(UserToken.token == token).first()
        if user_token:
            user_token.is_revoked = True
            db.commit()

    @staticmethod
    def add_active_connection(db: Session, board_id: str, user_id: str, 
                            websocket_id: str = None, ip_address: str = None, 
                            user_agent: str = None):
        """Add or update active connection"""
        # Remove any existing connection for this user (only one connection per user)
        db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id,
            ActiveConnection.user_id == user_id
        ).delete()
        
        connection = ActiveConnection(
            board_id=board_id,
            user_id=user_id,
            websocket_id=websocket_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(connection)
        db.commit()

    @staticmethod
    def update_connection_heartbeat(db: Session, board_id: str, user_id: str):
        """Update last heartbeat timestamp"""
        connection = db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id,
            ActiveConnection.user_id == user_id
        ).first()
        
        if connection:
            connection.last_heartbeat = time.time()
            db.commit()

    @staticmethod
    def remove_active_connection(db: Session, board_id: str, user_id: str):
        """Remove active connection"""
        db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id,
            ActiveConnection.user_id == user_id
        ).delete()
        db.commit()

    @staticmethod
    def get_active_connections_count(db: Session, board_id: str) -> int:
        """Get count of active connections for a board"""
        return db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id
        ).count()

    @staticmethod
    def get_active_users(db: Session, board_id: str) -> List[str]:
        """Get list of user_ids with active connections"""
        connections = db.query(ActiveConnection).filter(
            ActiveConnection.board_id == board_id
        ).all()
        return [conn.user_id for conn in connections]

    @staticmethod
    def cleanup_stale_connections(db: Session, timeout_seconds: int = 30):
        """Remove connections with stale heartbeats"""
        cutoff = time.time() - timeout_seconds
        db.query(ActiveConnection).filter(
            ActiveConnection.last_heartbeat < cutoff
        ).delete()
        db.commit()

    @staticmethod
    def check_rate_limit(db: Session, user_id: str, board_id: str, 
                        action_type: str, points: int = 1) -> bool:
        """Check and update rate limit"""
        now = time.time()
        window_seconds = 60
        
        # Find or create rate limit record
        rate_limit = db.query(RateLimit).filter(
            RateLimit.user_id == user_id,
            RateLimit.board_id == board_id,
            RateLimit.action_type == action_type
        ).first()
        
        if not rate_limit:
            rate_limit = RateLimit(
                user_id=user_id,
                board_id=board_id,
                action_type=action_type,
                points=0,
                window_start=now
            )
            db.add(rate_limit)
        
        # Check if window has expired
        if now - rate_limit.window_start > window_seconds:
            rate_limit.points = 0
            rate_limit.window_start = now
        
        # Check limit (1000 points per minute)
        if rate_limit.points + points > 1000:
            return False
        
        # Update points
        rate_limit.points += points
        db.commit()
        return True

    @staticmethod
    def create_admin_timer(db: Session, board_id: str):
        """Create admin disconnect timer"""
        now = time.time()
        admin_timer = db.query(AdminTimer).filter(
            AdminTimer.board_id == board_id
        ).first()

        if admin_timer:
            admin_timer.admin_disconnected_at = now
            admin_timer.scheduled_shutdown_at = now + 600  # 10 minutes
            admin_timer.is_active = True
        else:
            admin_timer = AdminTimer(
                board_id=board_id,
                admin_disconnected_at=now,
                scheduled_shutdown_at=now + 600,  # 10 minutes
                is_active=True
            )
            db.add(admin_timer)

        db.commit()

    @staticmethod
    def cancel_admin_timer(db: Session, board_id: str):
        """Cancel admin disconnect timer"""
        admin_timer = db.query(AdminTimer).filter(
            AdminTimer.board_id == board_id,
            AdminTimer.is_active
        ).first()
        
        if admin_timer:
            admin_timer.is_active = False
            db.commit()

    @staticmethod
    def get_expired_admin_timers(db: Session) -> List[AdminTimer]:
        """Get timers that have expired"""
        now = time.time()
        return db.query(AdminTimer).filter(
            AdminTimer.is_active,
            AdminTimer.scheduled_shutdown_at <= now
        ).all()

    @staticmethod
    def update_connection_state(db: Session, board_id: str, user_id: str, 
                            cursor_x: float = None, cursor_y: float = None, 
                            active_tool: str = None):
        """Update user's connection state (cursor position, tool)"""
        state = db.query(ConnectionState).filter(
            ConnectionState.board_id == board_id,
            ConnectionState.user_id == user_id
        ).first()
        
        if not state:
            state = ConnectionState(
                board_id=board_id,
                user_id=user_id,
                cursor_x=cursor_x or 0,
                cursor_y=cursor_y or 0,
                active_tool=active_tool or "pen"
            )
            db.add(state)
        else:
            if cursor_x is not None:
                state.cursor_x = cursor_x
            if cursor_y is not None:
                state.cursor_y = cursor_y
            if active_tool is not None:
                state.active_tool = active_tool
            state.last_activity = time.time()
        
        db.commit()

    @staticmethod
    def update_board_activity(db: Session, board_id: str):
        """Update board's last activity timestamp"""
        board = DatabaseService.get_board(db, board_id)
        if board:
            board.last_activity = time.time()
            db.commit()

    @staticmethod
    def increment_object_count(db: Session, board_id: str):
        """Increment board's object count"""
        board = DatabaseService.get_board(db, board_id)
        if board:
            board.object_count += 1
            db.commit()

    @staticmethod
    def decrement_object_count(db: Session, board_id: str):
        """Decrement board's object count"""
        board = DatabaseService.get_board(db, board_id)
        if board and board.object_count > 0:
            board.object_count -= 1
            db.commit()
