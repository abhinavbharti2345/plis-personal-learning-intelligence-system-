import { useCallback, useEffect, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { saveWhiteboardState, subscribeToWhiteboard } from '../services/whiteboardService';

const normalizeScene = (elements = [], appState = {}, files = {}) => ({
  elements,
  appState: {
    ...appState,
    collaborators: undefined,
  },
  files,
});

const serializeScene = (scene) => JSON.stringify(scene || { elements: [], appState: {}, files: {} });

const Whiteboard = ({ roomId }) => {
  const apiRef = useRef(null);
  const saveTimerRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const lastSyncedRef = useRef('');

  const handleChange = useCallback((elements, appState, files) => {
    if (!roomId || !apiRef.current || applyingRemoteRef.current) return;

    const scene = normalizeScene(elements, appState, files);
    const serialized = serializeScene(scene);
    if (serialized === lastSyncedRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveWhiteboardState(roomId, scene);
        lastSyncedRef.current = serialized;
      } catch {
        // Ignore intermittent sync errors to keep drawing fluid.
      }
    }, 220);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return undefined;

    const unsubscribe = subscribeToWhiteboard(roomId, (state) => {
      const api = apiRef.current;
      if (!api) return;

      const scene = state?.strokes;
      if (!scene || !Array.isArray(scene.elements)) return;

      const normalized = normalizeScene(scene.elements, scene.appState || {}, scene.files || {});
      const serialized = serializeScene(normalized);

      if (serialized === lastSyncedRef.current) return;

      applyingRemoteRef.current = true;
      api.updateScene(normalized);
      lastSyncedRef.current = serialized;

      requestAnimationFrame(() => {
        applyingRemoteRef.current = false;
      });
    });

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      unsubscribe();
    };
  }, [roomId]);

  return (
    <div className="h-full w-full flex">
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        onChange={handleChange}
      />
    </div>
  );
};

export default Whiteboard;
