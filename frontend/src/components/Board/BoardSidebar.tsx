import React from 'react';
import { FiSettings, FiUsers, FiLayers } from 'react-icons/fi';
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

export const BoardSidebar: React.FC<BoardSidebarProps> = ({
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
  return (
    <div className="w-64 bg-white border-r flex flex-col">
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 text-center ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => onTabChange('tools')}
        >
          <div className="flex items-center justify-center">
            <FiSettings className="mr-2" /> Tools
          </div>
        </button>
        <button
          className={`flex-1 py-3 text-center ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => onTabChange('users')}
        >
          <div className="flex items-center justify-center">
            <FiUsers className="mr-2" /> Users
          </div>
        </button>
        <button
          className={`flex-1 py-3 text-center ${activeTab === 'layers' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          onClick={() => onTabChange('layers')}
        >
          <div className="flex items-center justify-center">
            <FiLayers className="mr-2" /> Layers
          </div>
        </button>
        {isAdmin && (
          <button
            className={`flex-1 py-3 text-center ${activeTab === 'admin' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => onTabChange('admin')}
          >
            <div className="flex items-center justify-center">
              <FiSettings className="mr-2" /> Admin
            </div>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
              <h3 className="font-semibold text-lg">Layers</h3>
              <button
                onClick={onAddLayer}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                + Add
              </button>
            </div>

            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className={`p-3 rounded-lg border ${activeLayerId === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <button
                        onClick={() => onLayerToggle(layer.id)}
                        className="mr-2"
                      >
                        {layer.hidden ? (
                          <span className="text-gray-400">👁️‍🗨️</span>
                        ) : (
                          <span>👁️</span>
                        )}
                      </button>
                      <span className={layer.hidden ? 'text-gray-400' : 'font-medium'}>
                        {layer.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {activeLayerId === layer.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <span className="text-xs text-gray-500">{index + 1}</span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        const newName = prompt('New layer name:', layer.name);
                        if (newName) onRenameLayer(layer.id, newName);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
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
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-700 mb-2">Active Layer:</div>
              <div className="font-medium">
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
    </div>
  );
};
