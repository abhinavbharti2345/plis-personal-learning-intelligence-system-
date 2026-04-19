import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, PencilBrush, Point } from 'fabric';
import { RiArrowLeftLine, RiBrush2Line, RiEraserLine, RiDeleteBin6Line, RiSendPlane2Line, RiMessage3Line, RiZoomInLine, RiZoomOutLine, RiFocus3Line, RiArrowGoBackLine, RiArrowGoForwardLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import { sendMessage, subscribeToChat } from '../services/chatService';
import { saveWhiteboardState, subscribeToWhiteboard } from '../services/whiteboardService';

const DEFAULT_ZOOM = 1.12;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const HISTORY_LIMIT = 60;

const formatTime = (ts) => {
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts) : new Date();
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const DiscussionPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getTopicById } = useTopics();

  const topic = getTopicById(topicId);
  const boardBg = '#ffffff';

  const canvasElementRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const saveTimerRef = useRef(null);
  const boardWrapRef = useRef(null);
  const historyStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastSnapshotRef = useRef('');
  const isSpacePressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panLastRef = useRef({ x: 0, y: 0 });

  const [tool, setTool] = useState('draw');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const bottomRef = useRef(null);

  const chatRoomId = useMemo(() => `discussion_${topicId}`, [topicId]);

  const getCanvasSnapshot = (canvas) => canvas.toDatalessJSON();

  const snapshotToString = (snapshot) => JSON.stringify(snapshot);

  const pushHistorySnapshot = (canvas) => {
    if (!canvas) return false;
    const snapshot = getCanvasSnapshot(canvas);
    const serialized = snapshotToString(snapshot);
    const history = historyStackRef.current;

    if (history[history.length - 1] === serialized) {
      return false;
    }

    history.push(serialized);
    if (history.length > HISTORY_LIMIT) {
      history.shift();
    }
    redoStackRef.current = [];
    lastSnapshotRef.current = serialized;
    return true;
  };

  const loadSnapshot = (canvas, snapshot) => new Promise((resolve) => {
    if (!canvas) {
      resolve();
      return;
    }

    applyingRemoteRef.current = true;
    canvas.loadFromJSON(snapshot, () => {
      canvas.backgroundColor = boardBg;
      canvas.requestRenderAll();
      applyingRemoteRef.current = false;
      resolve();
    });
  });

  const centerViewport = (canvas, nextZoom = DEFAULT_ZOOM) => {
    if (!canvas) return;
    const parent = boardWrapRef.current;
    const width = Math.max(320, parent?.clientWidth || 700);
    const height = Math.max(360, parent?.clientHeight || 520);
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));

    canvas.setViewportTransform([
      clampedZoom,
      0,
      0,
      clampedZoom,
      (width - width * clampedZoom) / 2,
      (height - height * clampedZoom) / 2,
    ]);
    canvas.requestRenderAll();
    setZoom(clampedZoom);
  };

  const scheduleBoardSave = () => {
    if (!fabricCanvasRef.current || applyingRemoteRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const json = fabricCanvasRef.current.toJSON();
        await saveWhiteboardState(topicId, json);
      } catch {
        toast.error('Failed to sync whiteboard');
      }
    }, 450);
  };

  const applyZoom = (nextZoom) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(new Point(center.x, center.y), clamped);
    setZoom(clamped);
    canvas.requestRenderAll();
  };

  const handleUndo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyStackRef.current.length <= 1) {
      return;
    }

    const current = historyStackRef.current.pop();
    redoStackRef.current.push(current);
    const previous = historyStackRef.current[historyStackRef.current.length - 1];

    await loadSnapshot(canvas, JSON.parse(previous));
    lastSnapshotRef.current = previous;
    scheduleBoardSave();
  };

  const handleRedo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) {
      return;
    }

    const next = redoStackRef.current.pop();
    historyStackRef.current.push(next);
    await loadSnapshot(canvas, JSON.parse(next));
    lastSnapshotRef.current = next;
    scheduleBoardSave();
  };

  useEffect(() => {
    if (!canvasElementRef.current) return;

    const parent = boardWrapRef.current;
    const width = Math.max(320, parent?.clientWidth || 700);
    const height = Math.max(360, parent?.clientHeight || 520);

    const canvas = new Canvas(canvasElementRef.current, {
      isDrawingMode: true,
      width,
      height,
      backgroundColor: boardBg,
      selection: false,
      preserveObjectStacking: true,
    });

    const brush = new PencilBrush(canvas);
    brush.width = 3;
    brush.color = '#111111';
    canvas.freeDrawingBrush = brush;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';

    centerViewport(canvas, DEFAULT_ZOOM);

    const handleToolState = () => {
      if (!canvas.freeDrawingBrush) return;
      canvas.freeDrawingBrush.color = tool === 'erase' ? boardBg : '#111111';
      canvas.freeDrawingBrush.width = tool === 'erase' ? 18 : 3;
      canvas.isDrawingMode = !isPanningRef.current;
      canvas.defaultCursor = isPanningRef.current ? 'grabbing' : 'crosshair';
      canvas.hoverCursor = isPanningRef.current ? 'grabbing' : 'crosshair';
    };

    const onWheel = (opt) => {
      const event = opt.e;
      event.preventDefault();
      const delta = event.deltaY;
      const currentZoom = canvas.getZoom();
      const zoomFactor = Math.pow(0.999, delta);
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentZoom * zoomFactor));
      canvas.zoomToPoint(new Point(event.offsetX, event.offsetY), nextZoom);
      setZoom(nextZoom);
      canvas.requestRenderAll();
    };

    const onMouseDown = (opt) => {
      const event = opt.e;
      const shouldPan = event.button === 1 || isSpacePressedRef.current;
      if (!shouldPan) return;

      event.preventDefault();
      isPanningRef.current = true;
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'grabbing';
      canvas.hoverCursor = 'grabbing';
      panStartRef.current = { x: event.clientX, y: event.clientY };
      panLastRef.current = { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (opt) => {
      if (!isPanningRef.current) return;
      const event = opt.e;
      event.preventDefault();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const deltaX = event.clientX - panLastRef.current.x;
      const deltaY = event.clientY - panLastRef.current.y;
      vpt[4] += deltaX;
      vpt[5] += deltaY;
      canvas.setViewportTransform(vpt);
      panLastRef.current = { x: event.clientX, y: event.clientY };
      canvas.requestRenderAll();
    };

    const endPan = () => {
      if (!isPanningRef.current) return;
      isPanningRef.current = false;
      handleToolState();
    };

    const onChanged = () => {
      if (applyingRemoteRef.current) return;
      const captured = pushHistorySnapshot(canvas);
      if (captured) {
        scheduleBoardSave();
      }
    };

    const onKeyDown = (event) => {
      const target = event.target;
      const isTypingTarget = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      if (event.code === 'Space' && !isTypingTarget) {
        event.preventDefault();
        isSpacePressedRef.current = true;
        handleToolState();
      }

      if ((event.ctrlKey || event.metaKey) && !isTypingTarget) {
        const key = event.key.toLowerCase();
        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        if (key === 'y') {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    const onKeyUp = (event) => {
      if (event.code === 'Space') {
        isSpacePressedRef.current = false;
        handleToolState();
      }
    };

    canvas.on('path:created', onChanged);
    canvas.on('object:modified', onChanged);
    canvas.on('object:removed', onChanged);
    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', endPan);
    canvas.on('mouse:wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      const nextWidth = Math.max(320, parent?.clientWidth || 700);
      const nextHeight = Math.max(360, parent?.clientHeight || 520);
      canvas.setDimensions({ width: nextWidth, height: nextHeight });
      if (!isPanningRef.current && Math.abs(canvas.getZoom() - DEFAULT_ZOOM) < 0.001) {
        centerViewport(canvas, canvas.getZoom());
      }
      canvas.requestRenderAll();
    };

    window.addEventListener('resize', onResize);
    fabricCanvasRef.current = canvas;
    pushHistorySnapshot(canvas);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.off('path:created', onChanged);
      canvas.off('object:modified', onChanged);
      canvas.off('object:removed', onChanged);
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', endPan);
      canvas.off('mouse:wheel', onWheel);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [topicId]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.backgroundColor = boardBg;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'erase'
        ? boardBg
        : '#111111';
      canvas.freeDrawingBrush.width = tool === 'erase' ? 18 : 3;
    }

    canvas.isDrawingMode = !isPanningRef.current;
    canvas.defaultCursor = isPanningRef.current || isSpacePressedRef.current ? 'grabbing' : 'crosshair';
    canvas.hoverCursor = isPanningRef.current || isSpacePressedRef.current ? 'grabbing' : 'crosshair';
    canvas.requestRenderAll();
  }, [tool, boardBg]);

  useEffect(() => {
    if (!topicId) return;
    const unsubscribe = subscribeToWhiteboard(topicId, (state) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      if (!state?.strokes) {
        if (historyStackRef.current.length === 0) {
          pushHistorySnapshot(canvas);
        }
        return;
      }

      const serialized = snapshotToString(state.strokes);
      if (serialized === lastSnapshotRef.current) {
        return;
      }

      loadSnapshot(canvas, state.strokes).then(() => {
        pushHistorySnapshot(canvas);
      });
    });

    return () => unsubscribe();
  }, [topicId, boardBg]);

  const handleZoomIn = () => applyZoom(zoom + 0.2);
  const handleZoomOut = () => applyZoom(zoom - 0.2);
  const handleResetView = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    canvas.requestRenderAll();
  };

  useEffect(() => {
    if (!chatRoomId) return;
    setMessages([]);
    const unsub = subscribeToChat(chatRoomId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => unsub();
  }, [chatRoomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClearBoard = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = boardBg;
    canvas.requestRenderAll();
    centerViewport(canvas, canvas.getZoom() || DEFAULT_ZOOM);
    pushHistorySnapshot(canvas);

    try {
      await saveWhiteboardState(topicId, canvas.toJSON());
      toast.success('Whiteboard cleared');
    } catch {
      toast.error('Failed to clear whiteboard');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    setSending(true);
    try {
      await sendMessage(chatRoomId, {
        uid: user.uid,
        displayName: user.displayName || user.email,
        text: text.trim(),
      });
      setText('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isOwn = (msg) => msg.uid === user?.uid;

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost -ml-1 text-sm">
          <RiArrowLeftLine size={16} /> Back
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-100 flex items-center gap-2">
            <RiMessage3Line className="text-accent-cyan" />
            {topic ? `${topic.title} — Discussion` : 'General — Discussion'}
          </h1>
          <p className="text-xs text-gray-500">Real-time chat + collaborative whiteboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6" style={{ height: 'calc(100vh - 220px)' }}>
        <div className="lg:col-span-7 card p-0 relative overflow-hidden" ref={boardWrapRef}>
          <div className="absolute top-4 left-4 z-20 bg-white/70 dark:bg-surface-800/80 backdrop-blur-md rounded-xl border border-white/60 dark:border-white/10 p-2 flex items-center gap-2 shadow-glass">
            <button
              onClick={() => setTool('draw')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${tool === 'draw' ? 'bg-brand-600 text-white' : 'bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]'}`}
            >
              <RiBrush2Line size={14} /> Draw
            </button>
            <button
              onClick={() => setTool('erase')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${tool === 'erase' ? 'bg-brand-600 text-white' : 'bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]'}`}
            >
              <RiEraserLine size={14} /> Erase
            </button>
            <button
              onClick={handleClearBoard}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300"
            >
              <RiDeleteBin6Line size={14} /> Clear
            </button>
            <button
              onClick={handleUndo}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]"
              title="Undo (Ctrl+Z)"
            >
              <RiArrowGoBackLine size={14} />
            </button>
            <button
              onClick={handleRedo}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]"
              title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
            >
              <RiArrowGoForwardLine size={14} />
            </button>
            <div className="w-px h-6 bg-surface-300 dark:bg-white/15 mx-1" />
            <button
              onClick={handleZoomOut}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]"
              title="Zoom out"
            >
              <RiZoomOutLine size={14} />
            </button>
            <span className="text-xs font-bold text-surface-700 dark:text-[#C9D1D9] min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]"
              title="Zoom in"
            >
              <RiZoomInLine size={14} />
            </button>
            <button
              onClick={handleResetView}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white/50 dark:bg-white/5 text-surface-700 dark:text-[#C9D1D9]"
              title="Reset view"
            >
              <RiFocus3Line size={14} />
            </button>
          </div>

          <canvas ref={canvasElementRef} className="w-full h-full" />
        </div>

        <div className="lg:col-span-3 card p-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-bold text-gray-100 text-sm">Discussion Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">No messages yet. Start the discussion.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${isOwn(msg) ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn(msg) && (
                    <div className="w-7 h-7 rounded-full bg-surface-700 text-gray-200 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {(msg.displayName || '?')[0].toUpperCase()}
                    </div>
                  )}

                  <div className={`max-w-[85%] ${isOwn(msg) ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!isOwn(msg) && <p className="text-[11px] text-gray-500">{msg.displayName}</p>}
                    <div className={`px-3 py-2 rounded-xl text-sm ${isOwn(msg) ? 'bg-brand-600 text-white' : 'bg-surface-700 text-gray-100'}`}>
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-gray-600">{formatTime(msg.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
              />
              <button type="submit" className="btn-primary px-3" disabled={sending || !text.trim()}>
                <RiSendPlane2Line size={17} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DiscussionPage;
