import React from 'react';
import {
  FiArrowRight,
  FiCircle,
  FiEdit2,
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiLayers,
  FiMinus,
  FiMousePointer,
  FiPenTool,
  FiRotateCcw,
  FiRotateCw,
  FiSquare,
  FiTrash2,
  FiType
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
  layers?: Array<{ id: string; name: string; hidden: boolean }>;
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
  { id: 'text' as ToolType, icon: FiType, label: 'Text' }
];

const colors = [
  '#111827',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff'
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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-base text-slate-900 mb-3">Toolbox</h3>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          return (
            <button
              key={tool.id}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-slate-700 transition-colors ${isActive ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 hover:bg-slate-50'}`}
              onClick={() => onToolChange(tool.id)}
              title={tool.label}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[11px] mt-1 font-medium">{tool.label}</span>
            </button>
          );
        })}
      </div>

      <h4 className="font-semibold text-sm text-slate-700 mb-2">Color</h4>
      <div className="grid grid-cols-6 gap-2 mb-5">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-105 ${currentColor === color ? 'border-slate-900' : 'border-slate-300 hover:border-slate-400'}`}
            style={{ backgroundColor: color }}
            onClick={() => onColorChange(color)}
            title={color}
          />
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <button
          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${canUndo ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <span className="inline-flex items-center justify-center">
            <FiRotateCcw className="mr-1.5" /> Undo
          </span>
        </button>
        <button
          className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${canRedo ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <span className="inline-flex items-center justify-center">
            <FiRotateCw className="mr-1.5" /> Redo
          </span>
        </button>
      </div>

      {layers.length > 0 && (
        <div className="mb-5">
          <h4 className="font-semibold text-sm mb-2 inline-flex items-center text-slate-700">
            <FiLayers className="mr-1.5 text-cyan-700" /> Quick Layer Access
          </h4>
          <div className="space-y-1.5">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center justify-between p-2 rounded-lg border ${activeLayerId === layer.id ? 'bg-cyan-50 border-cyan-200' : 'bg-slate-50 border-slate-200'}`}
              >
                <div className="flex items-center">
                  <button
                    onClick={() => onLayerToggle?.(layer.id)}
                    className="mr-2 text-slate-500 hover:text-slate-700"
                  >
                    {layer.hidden ? <FiEyeOff /> : <FiEye />}
                  </button>
                  <span
                    className={`cursor-pointer text-sm ${layer.hidden ? 'text-slate-400' : 'text-slate-700'}`}
                    onClick={() => onLayerChange?.(layer.id)}
                  >
                    {layer.name}
                  </span>
                </div>
                {activeLayerId === layer.id && (
                  <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Current Tool</div>
        <div className="font-semibold capitalize text-slate-900 mt-1">{currentTool}</div>
        <div className="flex items-center mt-2">
          <div className="w-5 h-5 rounded-full border border-slate-300 mr-2" style={{ backgroundColor: currentColor }} />
          <div className="text-sm text-slate-600">{currentColor}</div>
        </div>
      </div>
    </div>
  );
};
