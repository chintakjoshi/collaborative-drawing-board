# Collaborative Drawing Board

Real-time collaborative drawing board with a FastAPI WebSocket backend and a React frontend. Users can create a board, share a six-character code, and draw together with strokes, shapes, text, cursors, and layers.

## Features

- Real-time multi-user drawing over WebSockets
- Create and join boards using a 6-character code
- Drawing tools: pen, marker, highlighter, shapes, text, eraser
- Layers with visibility toggles
- Basic moderation UI (kick/ban/timeout/end session hooks in the UI)
- Admin disconnect timer and session auto-end behavior
- SQLite persistence for board state and strokes

## Tech Stack

- Backend: FastAPI, Uvicorn, SQLAlchemy, SQLite
- Frontend: React, TypeScript, Tailwind CSS, React Konva
- Transport: WebSockets

## Repository Structure

- `backend/` FastAPI application, WebSocket endpoints, and SQLite database
- `frontend/` React client with drawing canvas and UI
- `README.md` Project overview and instructions

## Architecture Flow

```
                 Browser
                    |
                    v
        React Frontend (Port 3000)
                    |
      WebSocket /ws/create or /ws/join/{boardId}
                    |
                    v
     FastAPI WebSocket Backend (Port 8000)
                    |
                    v
     SQLite Database (backend/drawing_app.db)
```

## Prerequisites

- Python 3.11+ (3.12 supported)
- Node.js 18+ and npm

## Local Development

### Backend

1. Create a virtual environment (optional but recommended)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies

```powershell
pip install -r requirements.txt
```

3. Start the API

```powershell
python main.py
```

The backend starts on `http://localhost:8000`.

### Frontend

1. Install dependencies

```powershell
cd frontend
npm install
```

2. Start the dev server

```powershell
npm start
```

The frontend runs on `http://localhost:3000` and connects to the backend on port `8000`.

## How It Works

- **Create board**: The client opens `/ws/create`. The server generates a board code, creates an admin user, and returns the board state.
- **Join board**: The client connects to `/ws/join/{boardId}` with an optional token. The server validates and returns the board state.
- **Draw events**: The client sends `stroke_start`, `stroke_points`, and `stroke_end`. The server persists and broadcasts to all connected users.
- **Shape and text events**: The client sends `shape_create` and `text_create`. The server persists and broadcasts.
- **Cursor updates**: The client sends `cursor_update` to show live pointers.

## WebSocket Message Types (Client to Server)

- `stroke_start` start a freehand stroke
- `stroke_points` stream stroke points
- `stroke_end` finish a stroke
- `shape_create` add a rectangle, circle, line, or arrow
- `text_create` add a text label
- `erase_path` erase path (client sends; server handling may be limited)
- `cursor_update` broadcast cursor position
- `undo` and `redo` (client sends; server handling may be limited)
- `admin_kick`, `admin_ban`, `admin_end_session` (server supports; UI wiring may be incomplete)

## Persistence

- SQLite database at `backend/drawing_app.db`
- Board state includes strokes, shapes, text objects, layers, users, and connection metadata

## Environment Notes

- CORS is configured for `http://localhost:3000` in `backend/main.py`
- If you change frontend port, update the backend CORS settings

## Common Issues

- **WebSocket disconnects under heavy load**: Reduce message volume and throttle cursor updates. The client already batches stroke points and throttles cursors.
- **Case-sensitive paths on Windows**: Use the same casing as the on-disk folder names, especially for `components/Board`.

## Scripts

Frontend:

- `npm start` start the dev server
- `npm run build` build for production

Backend:

- `python main.py` run the API server