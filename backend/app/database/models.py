# models.py - UPDATED VERSION
from sqlalchemy.schema import Index
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), index=True, nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    nickname = Column(String(100), nullable=False)
    role = Column(String(10), default="user")
    connected = Column(Boolean, default=True)
    cursor_x = Column(Float, default=0)
    cursor_y = Column(Float, default=0)
    active_tool = Column(String(20), default="pen")
    color = Column(String(7), default="#000000")
    connected_at = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Relationships - will be defined after Board is created
    board = relationship("Board", back_populates="users")

class Board(Base):
    __tablename__ = "boards"
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(6), unique=True, index=True, nullable=False)
    admin_id = Column(String(255), nullable=False)
    created_at = Column(Float, default=lambda: datetime.now().timestamp())
    max_users = Column(Integer, default=10)
    max_objects = Column(Integer, default=5000)
    is_active = Column(Boolean, default=True)
    last_activity = Column(Float, default=lambda: datetime.now().timestamp())
    object_count = Column(Integer, default=0)
    
    # Relationships
    users = relationship("User", back_populates="board", cascade="all, delete-orphan")
    strokes = relationship("Stroke", back_populates="board", cascade="all, delete-orphan")
    shapes = relationship("Shape", back_populates="board", cascade="all, delete-orphan")
    texts = relationship("TextObject", back_populates="board", cascade="all, delete-orphan")
    layers = relationship("Layer", back_populates="board", cascade="all, delete-orphan")
    banned_tokens = relationship("BannedToken", back_populates="board", cascade="all, delete-orphan")
    timeouts = relationship("Timeout", back_populates="board", cascade="all, delete-orphan")

# Other models follow...
class Stroke(Base):
    __tablename__ = "strokes"
    
    id = Column(Integer, primary_key=True, index=True)
    stroke_id = Column(String(255), unique=True, index=True, nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    user_id = Column(String(255), nullable=False)
    layer_id = Column(String(255), default="default")
    brush_type = Column(String(20), nullable=False)
    color = Column(String(7), nullable=False)
    width = Column(Float, nullable=False)
    created_at = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Relationships
    board = relationship("Board", back_populates="strokes")
    points = relationship("StrokePoint", back_populates="stroke", cascade="all, delete-orphan")

class StrokePoint(Base):
    __tablename__ = "stroke_points"
    
    id = Column(Integer, primary_key=True, index=True)
    stroke_id = Column(String(255), ForeignKey("strokes.stroke_id"), nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    pressure = Column(Float, default=0.5)
    timestamp = Column(Float, default=lambda: datetime.now().timestamp())
    point_order = Column(Integer, nullable=False)
    
    # Relationships
    stroke = relationship("Stroke", back_populates="points")

class Shape(Base):
    __tablename__ = "shapes"
    
    id = Column(Integer, primary_key=True, index=True)
    shape_id = Column(String(255), unique=True, index=True, nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    user_id = Column(String(255), nullable=False)
    layer_id = Column(String(255), default="default")
    type = Column(String(20), nullable=False)
    start_x = Column(Float, nullable=False)
    start_y = Column(Float, nullable=False)
    end_x = Column(Float, nullable=False)
    end_y = Column(Float, nullable=False)
    color = Column(String(7), nullable=False)
    stroke_width = Column(Float, nullable=False)
    created_at = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Relationships
    board = relationship("Board", back_populates="shapes")

class TextObject(Base):
    __tablename__ = "text_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    text_id = Column(String(255), unique=True, index=True, nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    user_id = Column(String(255), nullable=False)
    layer_id = Column(String(255), default="default")
    text = Column(Text, nullable=False)
    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    color = Column(String(7), nullable=False)
    font_size = Column(Float, default=16)
    font_family = Column(String(50), default="Arial")
    created_at = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Relationships
    board = relationship("Board", back_populates="texts")

class Layer(Base):
    __tablename__ = "layers"
    
    id = Column(Integer, primary_key=True, index=True)
    layer_id = Column(String(255), index=True, nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    name = Column(String(100), nullable=False)
    hidden = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    
    # Relationships
    board = relationship("Board", back_populates="layers")

class BannedToken(Base):
    __tablename__ = "banned_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    token = Column(String(255), nullable=False)
    banned_at = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Relationships
    board = relationship("Board", back_populates="banned_tokens")

class Timeout(Base):
    __tablename__ = "timeouts"
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    user_id = Column(String(255), nullable=False)
    timeout_until = Column(Float, nullable=False)
    
    # Relationships
    board = relationship("Board", back_populates="timeouts")

class ActiveConnection(Base):
    __tablename__ = "active_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    user_id = Column(String(255), nullable=False)
    websocket_id = Column(String(255), nullable=True)
    connected_at = Column(Float, default=lambda: datetime.now().timestamp())
    last_heartbeat = Column(Float, default=lambda: datetime.now().timestamp())
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Indexes for faster queries
    __table_args__ = (
        Index('idx_active_connections_board_user', 'board_id', 'user_id'),
        Index('idx_active_connections_heartbeat', 'last_heartbeat'),
    )
    
    # Relationships - use backref for simpler circular references
    board = relationship("Board", backref="active_connections_list")

class UserToken(Base):
    __tablename__ = "user_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    token = Column(String(255), nullable=False, unique=True)
    created_at = Column(Float, default=lambda: datetime.now().timestamp())
    expires_at = Column(Float, nullable=True)
    is_revoked = Column(Boolean, default=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_user_tokens_user_board', 'user_id', 'board_id'),
        Index('idx_user_tokens_token', 'token'),
    )
    
    # Relationships - use backref
    board = relationship("Board", backref="user_tokens_list")

class RateLimit(Base):
    __tablename__ = "rate_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    action_type = Column(String(50), nullable=False)
    points = Column(Integer, default=0)
    window_start = Column(Float, nullable=False)
    window_seconds = Column(Integer, default=60)
    
    # Indexes
    __table_args__ = (
        Index('idx_rate_limits_user_board', 'user_id', 'board_id', 'action_type'),
        Index('idx_rate_limits_window', 'window_start'),
    )
    
    # Relationships - use backref
    board = relationship("Board", backref="rate_limits_list")

class AdminTimer(Base):
    __tablename__ = "admin_timers"
    
    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False, unique=True)
    admin_disconnected_at = Column(Float, nullable=False)
    scheduled_shutdown_at = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships - use backref
    board = relationship("Board", backref=backref("admin_timer_instance", uselist=False))

class ConnectionState(Base):
    __tablename__ = "connection_states"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    board_id = Column(String(6), ForeignKey("boards.board_id"), nullable=False)
    cursor_x = Column(Float, default=0)
    cursor_y = Column(Float, default=0)
    active_tool = Column(String(20), default="pen")
    last_activity = Column(Float, default=lambda: datetime.now().timestamp())
    
    # Indexes
    __table_args__ = (
        Index('idx_connection_states_user_board', 'user_id', 'board_id'),
    )
    
    # Relationships - use backref
    board = relationship("Board", backref="connection_states_list")
