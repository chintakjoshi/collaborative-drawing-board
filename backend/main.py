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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Drawing API"}

@app.post("/api/board/create")
async def create_board():
    """Create a new board and return join code"""
    return {"status": "endpoint not implemented in websocket version"}

@app.websocket("/ws/{board_id}")
async def websocket_endpoint(websocket: WebSocket, board_id: str = None):
    await websocket.accept()
    
    ws_manager = websocket.app.state.ws_manager
    
    try:
        # Initial handshake
        data = await websocket.receive_json()
        action = data.get("action")
        
        if action == "create":
            # Create new board
            board_info = await ws_manager.create_board(websocket)
            await websocket.send_json({
                "type": "welcome",
                **board_info
            })
            
            # Store connection
            ws_manager.active_connections[board_info["board_id"]][board_info["user_id"]] = websocket
            
        elif action == "join" and board_id:
            # Join existing board
            board_info = await ws_manager.join_board(board_id, websocket)
            if not board_info:
                await websocket.send_json({"type": "error", "message": "Board not found or full"})
                await websocket.close()
                return
                
            await websocket.send_json({
                "type": "welcome",
                **board_info
            })
            
            # Store connection
            ws_manager.active_connections[board_id][board_info["user_id"]] = websocket
            user_id = board_info["user_id"]
            
        else:
            await websocket.send_json({"type": "error", "message": "Invalid action"})
            await websocket.close()
            return
            
        # Main message loop
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_drawing(board_id or board_info["board_id"], user_id, data)
            
    except WebSocketDisconnect:
        if board_id and 'user_id' in locals():
            await ws_manager.disconnect(board_id, user_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)