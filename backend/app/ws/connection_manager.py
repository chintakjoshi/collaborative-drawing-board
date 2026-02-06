import asyncio
from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    """Lightweight in-memory manager JUST for WebSocket connections"""
    
    def __init__(self):
        # Store only WebSocket connections
        self.active_websockets: Dict[str, Dict[str, WebSocket]] = {}
        
    async def connect(self, board_id: str, user_id: str, websocket: WebSocket):
        """Add WebSocket connection"""
        if board_id not in self.active_websockets:
            self.active_websockets[board_id] = {}
        self.active_websockets[board_id][user_id] = websocket
        
    async def disconnect(self, board_id: str, user_id: str):
        """Remove WebSocket connection"""
        if board_id in self.active_websockets and user_id in self.active_websockets[board_id]:
            del self.active_websockets[board_id][user_id]
            # Clean up empty board
            if not self.active_websockets[board_id]:
                del self.active_websockets[board_id]
                
    async def send_to_user(self, board_id: str, user_id: str, message: dict):
        """Send message to specific user"""
        if (board_id in self.active_websockets and 
            user_id in self.active_websockets[board_id]):
            try:
                websocket = self.active_websockets[board_id][user_id]
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending to user {user_id}: {e}")
                await self.disconnect(board_id, user_id)
                
    async def broadcast_to_board(self, board_id: str, message: dict, exclude_user: str = None):
        """Broadcast message to all users in board"""
        if board_id not in self.active_websockets:
            return
            
        disconnected_users = []
        
        for user_id, websocket in list(self.active_websockets[board_id].items()):
            if user_id == exclude_user:
                continue
                
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to user {user_id}: {e}")
                disconnected_users.append(user_id)
                
        # Clean up disconnected users
        for user_id in disconnected_users:
            await self.disconnect(board_id, user_id)
            
    def get_connected_users(self, board_id: str) -> Set[str]:
        """Get set of user_ids with active WebSocket connections"""
        if board_id in self.active_websockets:
            return set(self.active_websockets[board_id].keys())
        return set()