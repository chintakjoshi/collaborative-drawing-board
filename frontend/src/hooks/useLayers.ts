import { useState, useCallback } from 'react';

export interface Layer {
    id: string;
    name: string;
    hidden: boolean;
    order: number;
}

export const useLayers = (initialLayers: Layer[] = [{ id: 'default', name: 'Layer 1', hidden: false, order: 0 }]) => {
    const [layers, setLayers] = useState<Layer[]>(initialLayers);
    const [activeLayerId, setActiveLayerId] = useState<string>(initialLayers[0]?.id || 'default');

    const addLayer = useCallback((name?: string) => {
        const newLayer: Layer = {
            id: `layer_${Date.now()}`,
            name: name || `Layer ${layers.length + 1}`,
            hidden: false,
            order: layers.length
        };
        setLayers(prev => [...prev, newLayer]);
        setActiveLayerId(newLayer.id);
        return newLayer;
    }, [layers.length]);

    const removeLayer = useCallback((layerId: string) => {
        if (layers.length <= 1) return; // Don't remove the last layer

        setLayers(prev => prev.filter(layer => layer.id !== layerId));

        if (activeLayerId === layerId) {
            setActiveLayerId(layers[0].id);
        }
    }, [layers, activeLayerId]);

    const toggleLayerVisibility = useCallback((layerId: string) => {
        setLayers(prev => prev.map(layer =>
            layer.id === layerId ? { ...layer, hidden: !layer.hidden } : layer
        ));
    }, []);

    const renameLayer = useCallback((layerId: string, newName: string) => {
        setLayers(prev => prev.map(layer =>
            layer.id === layerId ? { ...layer, name: newName } : layer
        ));
    }, []);

    const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
        setLayers(prev => {
            const newLayers = [...prev];
            const [removed] = newLayers.splice(fromIndex, 1);
            newLayers.splice(toIndex, 0, removed);

            // Update order
            return newLayers.map((layer, index) => ({
                ...layer,
                order: index
            }));
        });
    }, []);

    return {
        layers,
        activeLayerId,
        setActiveLayerId,
        addLayer,
        removeLayer,
        toggleLayerVisibility,
        renameLayer,
        reorderLayers
    };
};