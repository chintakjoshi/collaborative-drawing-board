import React from 'react';
import {
    FiPenTool,
    FiSquare,
    FiCircle,
    FiMinus,
    FiArrowRight,
    FiType,
    FiMousePointer,
    FiTrash2,
    FiEdit3,
    FiEdit2,
    FiRotateCcw,
    FiRotateCw,
    FiLayers,
    FiEye,
    FiEyeOff
} from 'react-icons/fi';
import { ToolType } from '../../types/drawing';

interface ToolbarProps {
    currentTool: ToolType;
    currentColor: string;
    onToolChange: (tool: ToolType) => void;
    onColorChange: (color: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    layers?: Array<{ id: string, name: string, hidden: boolean }>;
    onLayerToggle?: (layerId: string) => void;
    activeLayerId?: string;
    onLayerChange?: (layerId: string) => void;
}

const tools = [
    { id: 'select' as ToolType, icon: FiMousePointer, label: 'Select' },
    { id: 'pen' as ToolType, icon: FiPenTool, label: 'Pen' },
    { id: 'marker' as ToolType, icon: FiEdit2, label: 'Marker' },
    { id: 'highlighter' as ToolType, icon: FiEdit3, label: 'Highlighter' },
    { id: 'eraser' as ToolType, icon: FiTrash2, label: 'Eraser' },
    { id: 'rectangle' as ToolType, icon: FiSquare, label: 'Rectangle' },
    { id: 'circle' as ToolType, icon: FiCircle, label: 'Circle' },
    { id: 'line' as ToolType, icon: FiMinus, label: 'Line' },
    { id: 'arrow' as ToolType, icon: FiArrowRight, label: 'Arrow' },
    { id: 'text' as ToolType, icon: FiType, label: 'Text' },
];

const colors = [
    '#000000', // black
    '#FF0000', // red
    '#00FF00', // green
    '#0000FF', // blue
    '#FFFF00', // yellow
    '#FF00FF', // magenta
    '#00FFFF', // cyan
    '#FFA500', // orange
    '#800080', // purple
    '#008000', // dark green
    '#FFFFFF', // white (with border)
];

export const Toolbar: React.FC<ToolbarProps> = ({
    currentTool,
    currentColor,
    onToolChange,
    onColorChange,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    layers = [],
    onLayerToggle,
    activeLayerId = 'default',
    onLayerChange
}) => {
    return (
        <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-4">Tools</h3>

            {/* Tool selection */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = currentTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            onClick={() => onToolChange(tool.id)}
                            title={tool.label}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs mt-1">{tool.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Color selection */}
            <h4 className="font-medium mb-2">Color</h4>
            <div className="grid grid-cols-6 gap-2 mb-6">
                {colors.map((color) => (
                    <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${currentColor === color ? 'border-gray-800' : 'border-gray-300 hover:border-gray-400'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => onColorChange(color)}
                        title={color}
                    />
                ))}
            </div>

            {/* Undo/Redo */}
            <div className="flex space-x-2 mb-6">
                <button
                    className={`flex-1 py-2 px-4 rounded-lg border ${canUndo ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                    onClick={onUndo}
                    disabled={!canUndo}
                >
                    <div className="flex items-center justify-center">
                        <FiRotateCcw className="mr-2" /> Undo
                    </div>
                </button>
                <button
                    className={`flex-1 py-2 px-4 rounded-lg border ${canRedo ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'}`}
                    onClick={onRedo}
                    disabled={!canRedo}
                >
                    <div className="flex items-center justify-center">
                        <FiRotateCw className="mr-2" /> Redo
                    </div>
                </button>
            </div>

            {/* Layers */}
            {layers.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-medium mb-2 flex items-center">
                        <FiLayers className="mr-2" /> Layers
                    </h4>
                    <div className="space-y-1">
                        {layers.map((layer) => (
                            <div
                                key={layer.id}
                                className={`flex items-center justify-between p-2 rounded ${activeLayerId === layer.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center">
                                    <button
                                        onClick={() => onLayerToggle?.(layer.id)}
                                        className="mr-2"
                                    >
                                        {layer.hidden ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                    <span
                                        className={`cursor-pointer ${layer.hidden ? 'text-gray-400' : ''}`}
                                        onClick={() => onLayerChange?.(layer.id)}
                                    >
                                        {layer.name}
                                    </span>
                                </div>
                                {activeLayerId === layer.id && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Current tool info */}
            <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Current Tool</div>
                <div className="font-medium capitalize">{currentTool}</div>
                <div className="flex items-center mt-2">
                    <div className="w-6 h-6 rounded-full border mr-2" style={{ backgroundColor: currentColor }} />
                    <div className="text-sm text-gray-700">{currentColor}</div>
                </div>
            </div>
        </div>
    );
};
