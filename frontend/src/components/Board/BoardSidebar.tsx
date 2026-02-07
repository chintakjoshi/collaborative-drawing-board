import React from 'react';
import {
  FiEdit3,
  FiEye,
  FiEyeOff,
  FiLayers,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUsers
} from 'react-icons/fi';
import { Toolbar } from '../Toolbar/Toolbar';
import { UserList } from '../Board/UserList';
import { AdminPanel } from '../Admin/AdminPanel';
import { Layer, ToolType, User } from '../../types/drawing';

type TabKey = 'tools' | 'users' | 'layers' | 'admin';

interface BoardSidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isAdmin: boolean;
  currentTool: ToolType;
  currentColor: string;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  layers: Layer[];
  activeLayerId: string;
  onLayerToggle: (layerId: string) => void;
  onLayerChange: (layerId: string) => void;
  onAddLayer: () => void;
  onRenameLayer: (layerId: string, name: string) => void;
  users: User[];
  currentUserId: string;
  onKickUser: (userId: string) => void;
  onTimeoutUser: (userId: string, minutes: number) => void;
  onBanUser: (userId: string) => void;
  onEndSession: () => void;
}

const areLayersEqual = (prevLayers: Layer[], nextLayers: Layer[]) => {
  if (prevLayers.length !== nextLayers.length) return false;

  for (let i = 0; i < prevLayers.length; i += 1) {
    const prev = prevLayers[i];
    const next = nextLayers[i];
    if (prev.id !== next.id || prev.name !== next.name || prev.hidden !== next.hidden) {
      return false;
    }
  }

  return true;
};

const areUsersEqualForSidebar = (prevUsers: User[], nextUsers: User[]) => {
  if (prevUsers.length !== nextUsers.length) return false;

  for (let i = 0; i < prevUsers.length; i += 1) {
    const prev = prevUsers[i];
    const next = nextUsers[i];

    if (
      prev.id !== next.id ||
      prev.nickname !== next.nickname ||
      prev.role !== next.role ||
      prev.color !== next.color ||
      prev.activeTool !== next.activeTool
    ) {
      return false;
    }
  }

  return true;
};

const BoardSidebarComponent: React.FC<BoardSidebarProps> = ({
  activeTab,
  onTabChange,
  isAdmin,
  currentTool,
  currentColor,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  layers,
  activeLayerId,
  onLayerToggle,
  onLayerChange,
  onAddLayer,
  onRenameLayer,
  users,
  currentUserId,
  onKickUser,
  onTimeoutUser,
  onBanUser,
  onEndSession
}) => {
  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'tools', label: 'Tools', icon: FiEdit3 },
    { key: 'users', label: 'Users', icon: FiUsers },
    { key: 'layers', label: 'Layers', icon: FiLayers }
  ];

  if (isAdmin) {
    tabs.push({ key: 'admin', label: 'Admin', icon: FiShield });
  }

  return (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
      <div className="px-3 pt-3">
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                className={`inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-semibold transition-colors border ${isActive ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                onClick={() => onTabChange(tab.key)}
              >
                <Icon className="text-sm" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 sm:p-4">
        {activeTab === 'tools' && (
          <Toolbar
            currentTool={currentTool}
            currentColor={currentColor}
            onToolChange={onToolChange}
            onColorChange={onColorChange}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            layers={layers}
            onLayerToggle={onLayerToggle}
            activeLayerId={activeLayerId}
            onLayerChange={onLayerChange}
          />
        )}

        {activeTab === 'users' && (
          <UserList
            users={users}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onKickUser={onKickUser}
          />
        )}

        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-900 inline-flex items-center">
                <FiLayers className="mr-2 text-cyan-700" /> Layers
              </h3>
              <button
                onClick={onAddLayer}
                className="px-3 py-1.5 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 inline-flex items-center"
              >
                <FiPlus className="mr-1.5" /> Add
              </button>
            </div>

            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-xl border transition-colors ${activeLayerId === layer.id ? 'border-cyan-400 bg-cyan-50/70' : 'border-slate-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <button
                        onClick={() => onLayerToggle(layer.id)}
                        className="mr-2 text-slate-500 hover:text-slate-700"
                        title={layer.hidden ? 'Show layer' : 'Hide layer'}
                      >
                        {layer.hidden ? <FiEyeOff /> : <FiEye />}
                      </button>
                      <span className={layer.hidden ? 'text-slate-400' : 'font-medium text-slate-900'}>
                        {layer.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activeLayerId === layer.id && (
                        <div className="w-2 h-2 bg-cyan-600 rounded-full"></div>
                      )}
                      <span className="text-xs text-slate-500">{index + 1}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        const newName = prompt('New layer name:', layer.name);
                        if (newName) onRenameLayer(layer.id, newName);
                      }}
                      className="text-xs text-cyan-700 hover:text-cyan-800 font-medium"
                    >
                      Rename
                    </button>
                    {layers.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete layer "${layer.name}"?`)) {
                            // Handle layer deletion
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium inline-flex items-center"
                      >
                        <FiTrash2 className="mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-sm text-slate-600 mb-1">Active Layer</div>
              <div className="font-semibold text-slate-900">
                {layers.find(l => l.id === activeLayerId)?.name || 'None'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel
            users={users}
            currentUserId={currentUserId}
            onKickUser={onKickUser}
            onTimeoutUser={onTimeoutUser}
            onBanUser={onBanUser}
            onEndSession={onEndSession}
          />
        )}
      </div>
    </aside>
  );
};

export const BoardSidebar = React.memo(BoardSidebarComponent, (prevProps, nextProps) => {
  if (
    prevProps.activeTab !== nextProps.activeTab ||
    prevProps.isAdmin !== nextProps.isAdmin ||
    prevProps.currentTool !== nextProps.currentTool ||
    prevProps.currentColor !== nextProps.currentColor ||
    prevProps.canUndo !== nextProps.canUndo ||
    prevProps.canRedo !== nextProps.canRedo ||
    prevProps.activeLayerId !== nextProps.activeLayerId ||
    prevProps.currentUserId !== nextProps.currentUserId ||
    prevProps.onTabChange !== nextProps.onTabChange ||
    prevProps.onToolChange !== nextProps.onToolChange ||
    prevProps.onColorChange !== nextProps.onColorChange ||
    prevProps.onUndo !== nextProps.onUndo ||
    prevProps.onRedo !== nextProps.onRedo ||
    prevProps.onLayerToggle !== nextProps.onLayerToggle ||
    prevProps.onLayerChange !== nextProps.onLayerChange ||
    prevProps.onAddLayer !== nextProps.onAddLayer ||
    prevProps.onRenameLayer !== nextProps.onRenameLayer ||
    prevProps.onKickUser !== nextProps.onKickUser ||
    prevProps.onTimeoutUser !== nextProps.onTimeoutUser ||
    prevProps.onBanUser !== nextProps.onBanUser ||
    prevProps.onEndSession !== nextProps.onEndSession
  ) {
    return false;
  }

  if (!areLayersEqual(prevProps.layers, nextProps.layers)) {
    return false;
  }

  if (!areUsersEqualForSidebar(prevProps.users, nextProps.users)) {
    return false;
  }

  return true;
});
