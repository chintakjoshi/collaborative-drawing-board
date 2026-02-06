from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio

from app.ws.websocket_manager import WebSocketManager
from app.ws.connection_manager import ConnectionManager
from app.database import init_db, get_db, DatabaseService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Drawing API...")
    init_db()
    
    # Initialize managers
    app.state.ws_manager = WebSocketManager()
    app.state.conn_manager = ConnectionManager()
    
    # Start background tasks
    app.state.cleanup_task = asyncio.create_task(cleanup_stale_connections(app))
    app.state.admin_timer_task = asyncio.create_task(check_admin_timers(app))
    
    print("Ready to accept connections")
    yield
    
    # Shutdown
    print("Shutting down Drawing API...")
    app.state.cleanup_task.cancel()
    app.state.admin_timer_task.cancel()

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def cleanup_stale_connections(app: FastAPI):
    """Background task to clean up stale connections"""
    while True:
        try:
            await asyncio.sleep(30)
            from app.database import get_db
            for db in get_db():
                try:
                    DatabaseService.cleanup_stale_connections(db, timeout_seconds=30)
                finally:
                    db.close()
                break
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in cleanup_stale_connections: {e}")

async def check_admin_timers(app: FastAPI):
    """Background task to check for expired admin timers"""
    while True:
        try:
            await asyncio.sleep(60)
            from app.database import get_db
            for db in get_db():
                try:
                    expired_timers = DatabaseService.get_expired_admin_timers(db)
                    for timer in expired_timers:
                        ws_manager = app.state.ws_manager
                        conn_manager = app.state.conn_manager
                        await ws_manager._end_session(timer.board_id, "system", conn_manager, db)
                        DatabaseService.cancel_admin_timer(db, timer.board_id)
                        print(f"Session auto-ended for board {timer.board_id} (admin timeout)")
                finally:
                    db.close()
                break
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in check_admin_timers: {e}")

# Helper function to get client info
def get_client_info(websocket: WebSocket) -> tuple:
    """Extract client IP and user agent from WebSocket"""
    client_ip = None
    user_agent = None
    
    if hasattr(websocket, 'client'):
        client_ip = websocket.client.host
    elif 'x-forwarded-for' in websocket.headers:
        client_ip = websocket.headers['x-forwarded-for'].split(',')[0]
    
    user_agent = websocket.headers.get('user-agent')
    
    return client_ip, user_agent

@app.get("/")
async def root():
    return {"status": "ok", "message": "Drawing API with SQLite"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "database": "sqlite"}

@app.websocket("/ws/create")
async def websocket_create_endpoint(websocket: WebSocket):
    """WebSocket endpoint for creating a new board"""
    await websocket.accept()
    
    ws_manager = websocket.app.state.ws_manager
    conn_manager = websocket.app.state.conn_manager
    
    board_id = None
    user_id = None
    
    try:
        # Get client info
        client_ip, user_agent = get_client_info(websocket)
        
        # Create new board
        board_info = await ws_manager.create_board(websocket, client_ip, user_agent)
        if not board_info:
            await websocket.close(code=1008, reason="Failed to create board")
            return
            
        board_id = board_info["board_id"]
        user_id = board_info["user_id"]
        
        # Store WebSocket connection
        await conn_manager.connect(board_id, user_id, websocket)
        
        # Send welcome message
        await websocket.send_json({
            "type": "welcome",
            **board_info
        })

        
        print(f"Board created: {board_id}, Admin: {user_id}")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_drawing(board_id, user_id, data, conn_manager)
            
    except WebSocketDisconnect:
        print(f"Admin disconnected: board={board_id}, user={user_id}")
        if board_id and user_id:
            await conn_manager.disconnect(board_id, user_id)
            await ws_manager.disconnect(board_id, user_id)
            await conn_manager.broadcast_to_board(board_id, {
                "type": "user_left",
                "user_id": user_id
            })
            await conn_manager.broadcast_to_board(board_id, {
                "type": "admin_disconnect_countdown",
                "seconds_remaining": 600
            })
    except Exception as e:
        print(f"WebSocket error in create: {e}")
        import traceback
        traceback.print_exc()
        if board_id and user_id:
            await conn_manager.disconnect(board_id, user_id)
            await ws_manager.disconnect(board_id, user_id)
            await conn_manager.broadcast_to_board(board_id, {
                "type": "user_left",
                "user_id": user_id
            })
            await conn_manager.broadcast_to_board(board_id, {
                "type": "admin_disconnect_countdown",
                "seconds_remaining": 600
            })
        try:
            await websocket.close()
        except:
            pass

@app.websocket("/ws/join/{board_id}")
async def websocket_join_endpoint(websocket: WebSocket, board_id: str):
    """WebSocket endpoint for joining an existing board"""
    await websocket.accept()
    
    ws_manager = websocket.app.state.ws_manager
    conn_manager = websocket.app.state.conn_manager
    
    user_id = None
    
    try:
        # Get client info
        client_ip, user_agent = get_client_info(websocket)
        
        # Check if board exists first
        from app.database import get_db
        board_exists = False
        for db in get_db():
            try:
                board = DatabaseService.get_board(db, board_id)
                if not board:
                    print(f"Board not found: {board_id}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Board not found. Please check the code and try again."
                    })
                    await websocket.close(code=1008, reason="Board not found")
                    return
                board_exists = True
            finally:
                db.close()
            break
        
        if not board_exists:
            await websocket.close(code=1008, reason="Database error")
            return
        
        user_token = websocket.query_params.get("token")
        if websocket.client_state != WebSocketState.CONNECTED:
            return
        
        # Join existing board
        board_info = await ws_manager.join_board(
            board_id, websocket, user_token, client_ip, user_agent
        )
        
        if not board_info:
            print(f"Failed to join board: {board_id}")
            await websocket.send_json({
                "type": "error",
                "message": "Failed to join board. It may be full or inactive."
            })
            await websocket.close(code=1008, reason="Cannot join board")
            return
        
        # Check for specific errors
        if "error" in board_info:
            error_messages = {
                "banned": "You are banned from this board",
                "timeout": "You are timed out from this board",
                "full": "Board is full (10 users maximum)"
            }
            error_msg = error_messages.get(board_info["error"], "Cannot join board")
            print(f"Join rejected for {board_id}: {board_info['error']}")
            await websocket.send_json({
                "type": "error",
                "message": error_msg
            })
            await websocket.close(code=1008, reason=board_info["error"])
            return
            
        user_id = board_info["user_id"]
        
        # Store WebSocket connection
        await conn_manager.connect(board_id, user_id, websocket)
        
        # Send welcome message
        if websocket.client_state != WebSocketState.CONNECTED:
            await conn_manager.disconnect(board_id, user_id)
            return
        try:
            await websocket.send_json({
                "type": "welcome",
                **board_info
            })
        except Exception as e:
            print(f"Welcome send failed: board={board_id}, user={user_id}, err={e}")
            await conn_manager.disconnect(board_id, user_id)
            return
        
        await conn_manager.broadcast_to_board(board_id, {
            "type": "user_joined",
            "user_id": user_id,
            "nickname": board_info.get("nickname"),
            "role": board_info.get("role", "user")
        }, exclude_user=user_id)

        if board_info.get("role") == "admin":
            await conn_manager.broadcast_to_board(board_id, {
                "type": "admin_reconnected"
            }, exclude_user=user_id)

        print(f"User joined board: {board_id}, User: {board_info['nickname']} ({user_id})")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            await ws_manager.handle_drawing(board_id, user_id, data, conn_manager)
            
    except WebSocketDisconnect:
        print(f"User disconnected: board={board_id}, user={user_id}")
        if user_id:
            await conn_manager.disconnect(board_id, user_id)
            await ws_manager.disconnect(board_id, user_id)
            await conn_manager.broadcast_to_board(board_id, {
                "type": "user_left",
                "user_id": user_id
            })
            is_admin = False
            from app.database import get_db
            for db in get_db():
                try:
                    board = DatabaseService.get_board(db, board_id)
                    if board and board.admin_id == user_id:
                        is_admin = True
                finally:
                    db.close()
                break
            if is_admin:
                await conn_manager.broadcast_to_board(board_id, {
                    "type": "admin_disconnect_countdown",
                    "seconds_remaining": 600
                })
    except Exception as e:
        print(f"WebSocket error in join: {e}")
        import traceback
        traceback.print_exc()
        if user_id:
            await conn_manager.disconnect(board_id, user_id)
            await ws_manager.disconnect(board_id, user_id)
            await conn_manager.broadcast_to_board(board_id, {
                "type": "user_left",
                "user_id": user_id
            })
            is_admin = False
            from app.database import get_db
            for db in get_db():
                try:
                    board = DatabaseService.get_board(db, board_id)
                    if board and board.admin_id == user_id:
                        is_admin = True
                finally:
                    db.close()
                break
            if is_admin:
                await conn_manager.broadcast_to_board(board_id, {
                    "type": "admin_disconnect_countdown",
                    "seconds_remaining": 600
                })
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)