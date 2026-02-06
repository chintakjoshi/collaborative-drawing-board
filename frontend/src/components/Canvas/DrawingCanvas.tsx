import React from 'react';
import { useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Arrow, Text } from 'react-konva';
import { Point, Stroke, ToolType } from '../../types/drawing';
import { Shape, TextObject } from '../../types/boardObjects';

interface DrawingCanvasProps {
    width: number;
    height: number;
    strokes: Stroke[];
    shapes: Shape[];
    textObjects: TextObject[];
    onDrawStart?: (point: Point) => void;
    onDrawMove?: (points: Point[]) => void;
    onDrawEnd?: () => void;
    onShapeStart?: (point: Point) => void;
    onShapeUpdate?: (start: Point, end: Point) => void;
    onShapeEnd?: (shape: any) => void;
    onTextCreate?: (text: string, point: Point) => void;
    onErase?: (points: Point[]) => void;
    currentTool: ToolType;
    currentColor: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    width,
    height,
    strokes,
    shapes = [],
    textObjects = [],
    onDrawStart,
    onDrawMove,
    onDrawEnd,
    onShapeStart,
    onShapeUpdate,
    onShapeEnd,
    onTextCreate,
    onErase,
    currentTool,
    currentColor
}) => {
    const stageRef = useRef<any>(null);
    const isDrawing = useRef(false);
    const isDrawingShape = useRef(false);
    const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
    const [shapeStart, setShapeStart] = useState<Point | null>(null);
    const [shapeEnd, setShapeEnd] = useState<Point | null>(null);
    const [textInput, setTextInput] = useState<{ visible: boolean, x: number, y: number }>({
        visible: false,
        x: 0,
        y: 0
    });

    const getStrokeWidth = (tool: ToolType) => {
        switch (tool) {
            case 'pen': return 5;
            case 'marker': return 10;
            case 'highlighter': return 20;
            default: return 5;
        }
    };

    const getOpacity = (tool: ToolType) => {
        return tool === 'highlighter' ? 0.3 : 1;
    };

    const handleMouseDown = (e: any) => {
        const pos = e.target.getStage().getPointerPosition();
        const point: Point = {
            x: pos.x,
            y: pos.y,
            pressure: 0.5,
            timestamp: Date.now()
        };

        if (currentTool === 'text') {
            setTextInput({ visible: true, x: pos.x, y: pos.y });
            return;
        }

        if (currentTool === 'eraser') {
            isDrawing.current = true;
            setCurrentPoints([point]);
            if (onErase) onErase([point]);
            return;
        }

        if (['rectangle', 'circle', 'line', 'arrow'].includes(currentTool)) {
            isDrawingShape.current = true;
            setShapeStart(point);
            setShapeEnd(point);
            if (onShapeStart) onShapeStart(point);
            return;
        }

        if (currentTool === 'select') {
            // Selection logic here
            return;
        }

        // Freehand drawing
        isDrawing.current = true;
        setCurrentPoints([point]);

        if (onDrawStart) {
            onDrawStart(point);
        }
    };

    const handleMouseMove = (e: any) => {
        const pos = e.target.getStage().getPointerPosition();
        const point: Point = {
            x: pos.x,
            y: pos.y,
            pressure: e.evt.pressure || 0.5,
            timestamp: Date.now()
        };

        if (currentTool === 'eraser' && isDrawing.current) {
            const newPoints = [...currentPoints, point];
            setCurrentPoints(newPoints);
            if (onErase) onErase([point]);
            return;
        }

        if (isDrawingShape.current && shapeStart) {
            setShapeEnd(point);
            if (onShapeUpdate) onShapeUpdate(shapeStart, point);
            return;
        }

        if (isDrawing.current) {
            const newPoints = [...currentPoints, point];
            setCurrentPoints(newPoints);

            if (onDrawMove) {
                onDrawMove([point]);
            }
        }
    };

    const handleMouseUp = () => {
        if (isDrawingShape.current && shapeStart && shapeEnd) {
            const shape = {
                type: currentTool,
                startX: shapeStart.x,
                startY: shapeStart.y,
                endX: shapeEnd.x,
                endY: shapeEnd.y,
                color: currentColor,
                strokeWidth: getStrokeWidth(currentTool)
            };
            if (onShapeEnd) onShapeEnd(shape);
        }

        isDrawing.current = false;
        isDrawingShape.current = false;
        setCurrentPoints([]);
        setShapeStart(null);
        setShapeEnd(null);

        if (onDrawEnd) {
            onDrawEnd();
        }
    };

    const handleTextSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && textInput.visible) {
            const text = e.currentTarget.value;
            if (text && onTextCreate) {
                onTextCreate(text, { x: textInput.x, y: textInput.y, pressure: 0.5, timestamp: Date.now() });
            }
            setTextInput({ visible: false, x: 0, y: 0 });
        }
    };

    return (
        <div className="canvas-container bg-gray-50 border rounded-lg overflow-hidden relative">
            <Stage
                width={width}
                height={height}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <Layer>
                    {/* Render existing strokes */}
                    {strokes.map((stroke) => (
                        <Line
                            key={stroke.id}
                            points={stroke.points.flatMap(p => [p.x, p.y])}
                            stroke={stroke.color}
                            strokeWidth={stroke.width}
                            lineCap="round"
                            lineJoin="round"
                            tension={0.5}
                            opacity={stroke.brushType === 'highlighter' ? 0.3 : 1}
                        />
                    ))}

                    {/* Render shapes - using snake_case properties from backend */}
                    {shapes.map((shape) => {
                        const width = Math.abs(shape.end_x - shape.start_x);
                        const height = Math.abs(shape.end_y - shape.start_y);
                        const x = Math.min(shape.start_x, shape.end_x);
                        const y = Math.min(shape.start_y, shape.end_y);

                        if (shape.type === 'rectangle') {
                            return (
                                <Rect
                                    key={shape.id}
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    stroke={shape.color}
                                    strokeWidth={shape.stroke_width}
                                />
                            );
                        } else if (shape.type === 'circle') {
                            const radius = Math.sqrt(width * width + height * height) / 2;
                            const centerX = (shape.start_x + shape.end_x) / 2;
                            const centerY = (shape.start_y + shape.end_y) / 2;
                            return (
                                <Circle
                                    key={shape.id}
                                    x={centerX}
                                    y={centerY}
                                    radius={radius}
                                    stroke={shape.color}
                                    strokeWidth={shape.stroke_width}
                                />
                            );
                        } else if (shape.type === 'line' || shape.type === 'arrow') {
                            return (
                                <Arrow
                                    key={shape.id}
                                    points={[shape.start_x, shape.start_y, shape.end_x, shape.end_y]}
                                    stroke={shape.color}
                                    strokeWidth={shape.stroke_width}
                                    fill={shape.color}
                                    pointerLength={shape.type === 'arrow' ? 10 : 0}
                                    pointerWidth={shape.type === 'arrow' ? 10 : 0}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Render text objects */}
                    {textObjects.map((textObj) => (
                        <Text
                            key={textObj.id}
                            x={textObj.x}
                            y={textObj.y}
                            text={textObj.text}
                            fontSize={textObj.font_size || 16}
                            fontFamily={textObj.font_family || 'Arial'}
                            fill={textObj.color}
                        />
                    ))}

                    {/* Render current drawing */}
                    {currentPoints.length > 0 && currentTool !== 'eraser' && (
                        <Line
                            points={currentPoints.flatMap(p => [p.x, p.y])}
                            stroke={currentColor}
                            strokeWidth={getStrokeWidth(currentTool)}
                            lineCap="round"
                            lineJoin="round"
                            tension={0.5}
                            opacity={getOpacity(currentTool)}
                        />
                    )}

                    {/* Render current shape preview */}
                    {isDrawingShape.current && shapeStart && shapeEnd && (
                        <>
                            {currentTool === 'rectangle' && (
                                <Rect
                                    x={Math.min(shapeStart.x, shapeEnd.x)}
                                    y={Math.min(shapeStart.y, shapeEnd.y)}
                                    width={Math.abs(shapeEnd.x - shapeStart.x)}
                                    height={Math.abs(shapeEnd.y - shapeStart.y)}
                                    stroke={currentColor}
                                    strokeWidth={getStrokeWidth(currentTool)}
                                    dash={[5, 5]}
                                />
                            )}
                            {currentTool === 'circle' && (
                                <Circle
                                    x={shapeStart.x}
                                    y={shapeStart.y}
                                    radius={Math.sqrt(
                                        Math.pow(shapeEnd.x - shapeStart.x, 2) +
                                        Math.pow(shapeEnd.y - shapeStart.y, 2)
                                    )}
                                    stroke={currentColor}
                                    strokeWidth={getStrokeWidth(currentTool)}
                                    dash={[5, 5]}
                                />
                            )}
                            {(currentTool === 'line' || currentTool === 'arrow') && (
                                <Arrow
                                    points={[shapeStart.x, shapeStart.y, shapeEnd.x, shapeEnd.y]}
                                    stroke={currentColor}
                                    strokeWidth={getStrokeWidth(currentTool)}
                                    fill={currentColor}
                                    pointerLength={currentTool === 'arrow' ? 10 : 0}
                                    pointerWidth={currentTool === 'arrow' ? 10 : 0}
                                    dash={[5, 5]}
                                />
                            )}
                        </>
                    )}

                    {/* Render eraser preview */}
                    {currentTool === 'eraser' && currentPoints.length > 0 && (
                        <Circle
                            x={currentPoints[currentPoints.length - 1]?.x || 0}
                            y={currentPoints[currentPoints.length - 1]?.y || 0}
                            radius={10}
                            stroke="#666"
                            strokeWidth={1}
                            dash={[5, 5]}
                            fill="rgba(200, 200, 200, 0.3)"
                        />
                    )}
                </Layer>
            </Stage>

            {/* Text input overlay */}
            {textInput.visible && (
                <input
                    type="text"
                    className="absolute border-2 border-blue-500 bg-white p-2 rounded shadow-lg outline-none"
                    style={{
                        left: `${textInput.x}px`,
                        top: `${textInput.y}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
                    autoFocus
                    onKeyDown={handleTextSubmit}
                    onBlur={() => setTextInput({ visible: false, x: 0, y: 0 })}
                />
            )}
        </div>
    );
};
