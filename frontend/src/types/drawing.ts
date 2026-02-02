export type ToolType =
    | 'pen'
    | 'marker'
    | 'highlighter'
    | 'eraser'
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'arrow'
    | 'text'
    | 'select';

export interface Point {
    x: number;
    y: number;
    pressure: number;
    timestamp: number;
}

export interface Stroke {
    id: string;
    userId: string;
    layerId: string;
    brushType: string;
    color: string;
    width: number;
    points: Point[];
    createdAt: number;
}

export interface User {
    id: string;
    nickname: string;
    role: 'admin' | 'user';
    cursorX: number;
    cursorY: number;
    activeTool: ToolType;
    color: string;
}

export interface BoardState {
    id: string;
    users: User[];
    strokes: Stroke[];
    layers: Layer[];
    objectCount: number;
    maxObjects: number;
    maxUsers: number;
}

export interface Layer {
    id: string;
    name: string;
    hidden: boolean;
    order: number;
}

export interface Cursor {
    userId: string;
    nickname: string;
    x: number;
    y: number;
    tool: ToolType;
    color: string;
}