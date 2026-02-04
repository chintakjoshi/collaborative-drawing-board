from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.ws.websocket_manager import WebSocketManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.ws_manager = WebSocketManager()
    yield
    # Shutdown
    # Cleanup code here

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://192.168.1.43:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Drawing API"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.websocket("/ws/create")
async def websocket_create_endpoint(websocket: WebSocket):
    """WebSocket endpoint for creating a new board"""
    await websocket.accept()
    
    ws_manager = websocket.app.state.ws_manager
    board_id = None
    user_id = None
    
    try:
        # Create new board
        board_info = await ws_manager.create_board(websocket)
        board_id = board_info["board_id"]
        user_id = board_info["user_id"]
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            **board_info
        })
        
        # Store connection
        ws_manager.active_connections[board_id][user_id] = websocket
        
        print(f"✅ Board created: {board_id}, Admin: {user_id}")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_drawing(board_id, user_id, data)
            
    except WebSocketDisconnect:
        print(f"❌ Create endpoint disconnected: board={board_id}, user={user_id}")
        if board_id and user_id:
            await ws_manager.disconnect(board_id, user_id)
    except Exception as e:
        print(f"❌ WebSocket error in create: {e}")
        if board_id and user_id:
            await ws_manager.disconnect(board_id, user_id)
        try:
            await websocket.close()
        except:
            pass

@app.websocket("/ws/join/{board_id}")
async def websocket_join_endpoint(websocket: WebSocket, board_id: str):
    """WebSocket endpoint for joining an existing board"""
    await websocket.accept()
    
    ws_manager = websocket.app.state.ws_manager
    user_id = None
    
    try:
        # Check if board exists first
        if board_id not in ws_manager.boards:
            print(f"❌ Board not found: {board_id}")
            await websocket.send_json({
                "type": "error",
                "message": "Board not found. Please check the code and try again."
            })
            await websocket.close(code=1008, reason="Board not found")
            return
        
        # Join existing board
        board_info = await ws_manager.join_board(board_id, websocket)
        
        if not board_info:
            print(f"❌ Failed to join board: {board_id}")
            await websocket.send_json({
                "type": "error",
                "message": "Failed to join board. It may be full or inactive."
            })
            await websocket.close(code=1008, reason="Cannot join board")
            return
        
        # Check for specific errors (banned, timeout, full)
        if "error" in board_info:
            error_messages = {
                "banned": "You are banned from this board",
                "timeout": "You are timed out from this board",
                "full": "Board is full (10 users maximum)"
            }
            error_msg = error_messages.get(board_info["error"], "Cannot join board")
            print(f"❌ Join rejected for {board_id}: {board_info['error']}")
            await websocket.send_json({
                "type": "error",
                "message": error_msg
            })
            await websocket.close(code=1008, reason=board_info["error"])
            return
            
        user_id = board_info["user_id"]
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            **board_info
        })
        
        print(f"✅ User joined board: {board_id}, User: {board_info['nickname']} ({user_id})")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_drawing(board_id, user_id, data)
            
    except WebSocketDisconnect:
        print(f"❌ Join endpoint disconnected: board={board_id}, user={user_id}")
        if user_id:
            await ws_manager.disconnect(board_id, user_id)
    except Exception as e:
        print(f"❌ WebSocket error in join: {e}")
        if user_id:
            await ws_manager.disconnect(board_id, user_id)
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)