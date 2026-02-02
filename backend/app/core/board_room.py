import asyncio
import json
import time
import uuid
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class ToolType(str, Enum):
    PEN = "pen"
    MARKER = "marker"
    HIGHLIGHTER = "highlighter"
    ERASER = "eraser"
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    LINE = "line"
    ARROW = "arrow"
    TEXT = "text"
    SELECT = "select"


@dataclass
class Point:
    x: float
    y: float
    pressure: float = 0.5
    timestamp: float = 0


@dataclass
class Stroke:
    id: str
    user_id: str
    layer_id: str
    brush_type: str
    color: str
    width: float
    points: List[Point]
    created_at: float


@dataclass
class User:
    id: str
    nickname: str
    role: UserRole
    cursor_x: float = 0
    cursor_y: float = 0
    active_tool: ToolType = ToolType.PEN
    connected_at: float = 0


class BoardRoom:
    def __init__(self, board_id: str, admin_id: str):
        self.board_id = board_id
        self.admin_id = admin_id
        self.created_at = time.time()
        self.users: Dict[str, User] = {}
        self.strokes: Dict[str, Stroke] = {}
        self.layers: List[Dict] = [{"id": "default", "name": "Layer 1", "hidden": False, "order": 0}]
        self.banned_tokens: Set[str] = set()
        self.timeouts: Dict[str, float] = {}
        self.object_count = 0
        self.max_objects = 5000
        self.max_users = 10
        self.last_activity = time.time()
        
        # Rate limiting
        self.user_rates: Dict[str, Dict] = {}
        
        # Admin disconnect timer
        self.admin_disconnected_at: Optional[float] = None
        self.shutdown_timer: Optional[asyncio.Task] = None
        
    def add_user(self, user_id: str, nickname: str, role: UserRole = UserRole.USER) -> bool:
        if len(self.users) >= self.max_users:
            return False
        
        if user_id in self.timeouts and self.timeouts[user_id] > time.time():
            return False
            
        self.users[user_id] = User(
            id=user_id,
            nickname=nickname,
            role=role,
            connected_at=time.time()
        )
        self.last_activity = time.time()
        return True
        
    def remove_user(self, user_id: str):
        if user_id in self.users:
            del self.users[user_id]
            
        # Check if admin left
        if user_id == self.admin_id:
            self.admin_disconnected_at = time.time()
            # Start 10-minute shutdown timer
            self._start_shutdown_timer()
            
    def _start_shutdown_timer(self):
        async def shutdown_task():
            await asyncio.sleep(600)  # 10 minutes
            # In production, this would trigger cleanup
            
        if self.shutdown_timer:
            self.shutdown_timer.cancel()
        self.shutdown_timer = asyncio.create_task(shutdown_task())
        
    def add_stroke(self, stroke: Stroke) -> bool:
        if self.object_count >= self.max_objects:
            return False
            
        self.strokes[stroke.id] = stroke
        self.object_count += 1
        self.last_activity = time.time()
        return True
        
    def check_rate_limit(self, user_id: str, points: int = 1) -> bool:
        now = time.time()
        if user_id not in self.user_rates:
            self.user_rates[user_id] = {
                "points": 0,
                "reset_time": now + 60  # 1 minute window
            }
            
        user_rate = self.user_rates[user_id]
        
        if now > user_rate["reset_time"]:
            user_rate["points"] = 0
            user_rate["reset_time"] = now + 60
            
        if user_rate["points"] + points > 1000:  # 1000 points per minute
            return False
            
        user_rate["points"] += points
        return True
        
    def to_dict(self):
        return {
            "board_id": self.board_id,
            "users": [asdict(u) for u in self.users.values()],
            "object_count": self.object_count,
            "admin_online": self.admin_id in self.users,
            "created_at": self.created_at
        }