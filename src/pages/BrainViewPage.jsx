// BrainViewPage.jsx — Obsidian-style interactive knowledge graph
import { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopics } from '../context/TopicContext';
import { getEffectiveStatus } from '../utils/clarityEngine';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, Handle, Position,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RiBrainLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

// ── Status → color mapping ──────────────────────────────────────────────────
const STATUS_COLORS = {
  strong:      { bg: '#10b981', border: '#059669', text: '#ecfdf5' },
  learning:    { bg: '#f59e0b', border: '#d97706', text: '#fffbeb' },
  not_started: { bg: '#374151', border: '#4b5563', text: '#d1d5db' },
  weak:        { bg: '#ef4444', border: '#dc2626', text: '#fef2f2' },
};

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'learning', label: 'Learning' },
  { value: 'weak', label: 'Weak' },
  { value: 'strong', label: 'Strong' },
];

const GraphNode = memo(({ data, selected }) => {
  const status = data.status || 'not_started';
  const colors = STATUS_COLORS[status] || STATUS_COLORS.not_started;
  const isDimmed = Boolean(data.isDimmed);

  return (
    <div
      className="group relative"
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        color: colors.text,
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        minWidth: '130px',
        maxWidth: '200px',
        textAlign: 'center',
        opacity: isDimmed ? 0.25 : 1,
        boxShadow: selected
          ? `0 0 0 2px ${colors.border}, 0 0 32px ${colors.bg}80`
          : `0 4px 20px ${colors.bg}40`,
        transition: 'opacity 140ms ease, box-shadow 140ms ease, transform 140ms ease',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-white/70 !border !border-white/30"
        style={{ opacity: 0.5 }}
      />

      <div className="truncate">{data.label}</div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border !border-white/40"
        style={{ opacity: 0.5 }}
      />
    </div>
  );
});

const nodeTypes = { graphNode: GraphNode };

const GRID_WIDTH = 6;
const GRID_X_GAP = 220;
const GRID_Y_GAP = 140;

const fallbackPosition = (index) => {
  const row = Math.floor(index / GRID_WIDTH);
  const col = index % GRID_WIDTH;
  return {
    x: col * GRID_X_GAP + 80,
    y: row * GRID_Y_GAP + 80,
  };
};

const BrainViewPage = () => {
  const { topics, editTopic, connectTopics, disconnectTopics, getTopicById } = useTopics();
  const navigate = useNavigate();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [search, setSearch] = useState('');
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [statusEditorTopicId, setStatusEditorTopicId] = useState(null);

  const saveTimersRef = useRef({});
  const clickTimerRef = useRef(null);

  const topicMap = useMemo(() => {
    const map = new Map();
    topics.forEach((topic) => map.set(topic.id, topic));
    return map;
  }, [topics]);

  const neighborSet = useMemo(() => {
    if (!selectedNodeId) return null;
    const selected = topicMap.get(selectedNodeId);
    const neighbors = new Set([selectedNodeId]);
    (selected?.connections || []).forEach((id) => neighbors.add(id));
    return neighbors;
  }, [selectedNodeId, topicMap]);

  const builtNodes = useMemo(() => {
    return topics.map((topic, index) => {
      const status = getEffectiveStatus(topic);
      const position = topic.position || fallbackPosition(index);
      const isDimmed = neighborSet ? !neighborSet.has(topic.id) : false;

      return {
        id: topic.id,
        type: 'graphNode',
        position,
        draggable: true,
        data: {
          label: topic.title,
          status,
          isDimmed,
        },
      };
    });
  }, [topics, neighborSet]);

  const builtEdges = useMemo(() => {
    const seen = new Set();
    const edges = [];

    topics.forEach((topic) => {
      const targets = topic.connections?.length
        ? topic.connections
        : topic.parentId ? [topic.parentId] : [];

      targets.forEach((targetId) => {
        if (!targetId || !topicMap.has(targetId) || topic.id === targetId) return;
        const [source, target] = topic.id < targetId
          ? [topic.id, targetId]
          : [targetId, topic.id];
        const edgeKey = `${source}::${target}`;
        if (seen.has(edgeKey)) return;
        seen.add(edgeKey);

        const isDimmed = neighborSet
          ? !(neighborSet.has(source) && neighborSet.has(target))
          : false;

        edges.push({
          id: `e-${source}-${target}`,
          source,
          target,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: isDimmed ? '#374151' : '#94a3b8',
            strokeWidth: isDimmed ? 1 : 1.8,
            opacity: isDimmed ? 0.2 : 0.9,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isDimmed ? '#374151' : '#94a3b8',
          },
        });
      });
    });

    return edges;
  }, [topics, topicMap, neighborSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  useEffect(() => {
    setNodes(builtNodes);
  }, [builtNodes, setNodes]);

  useEffect(() => {
    setEdges(builtEdges);
  }, [builtEdges, setEdges]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') setIsSpacePressed(true);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      navigate(`/topic/${node.id}`);
    }, 220);
  }, [navigate]);

  const onNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setSelectedNodeId(node.id);
    setStatusEditorTopicId(node.id);
  }, []);

  const onNodeDragStop = useCallback(async (_, node) => {
    const { id, position } = node;

    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
    }

    saveTimersRef.current[id] = setTimeout(async () => {
      try {
        await editTopic(id, {
          position: {
            x: Math.round(position.x),
            y: Math.round(position.y),
          },
        });
      } catch {
        // Ignore save failures for drag persistence to keep interaction smooth.
      }
    }, 220);
  }, [editTopic]);

  const onConnect = useCallback(async (params) => {
    if (!params?.source || !params?.target || params.source === params.target) return;
    try {
      await connectTopics(params.source, params.target);
    } catch {
      // Keep UI responsive if Firestore write fails.
    } finally {
      setConnectingFrom(null);
    }
  }, [connectTopics]);

  const onConnectStart = useCallback((_, info) => {
    setConnectingFrom(info?.nodeId || null);
  }, []);

  const onConnectEnd = useCallback(() => {
    setConnectingFrom(null);
  }, []);

  const onEdgeClick = useCallback(async (_, edge) => {
    if (!edge?.source || !edge?.target) return;
    const ok = window.confirm('Remove this connection?');
    if (!ok) return;
    try {
      await disconnectTopics(edge.source, edge.target);
    } catch {
      // Keep interaction non-blocking if delete fails.
    }
  }, [disconnectTopics]);

  const handleSearchFocus = useCallback(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      reactFlowInstance?.fitView({ padding: 0.2, duration: 500 });
      return;
    }

    const match = topics.find((topic) => topic.title.toLowerCase().includes(q));
    if (!match) return;

    const currentNode = nodes.find((n) => n.id === match.id);
    if (!currentNode) return;

    setSelectedNodeId(match.id);
    reactFlowInstance?.setCenter(
      currentNode.position.x + 80,
      currentNode.position.y + 20,
      { zoom: 1.35, duration: 550 }
    );
  }, [search, topics, nodes, reactFlowInstance]);

  const handleUpdateStatus = useCallback(async (newStatus) => {
    if (!statusEditorTopicId) return;
    try {
      await editTopic(statusEditorTopicId, { status: newStatus });
      toast.success(`Status set to ${newStatus.replace('_', ' ')}`);
      setStatusEditorTopicId(null);
    } catch {
      toast.error('Failed to update status');
    }
  }, [editTopic, statusEditorTopicId]);

  const connectingTopic = connectingFrom ? getTopicById(connectingFrom) : null;
  const statusEditorTopic = statusEditorTopicId ? getTopicById(statusEditorTopicId) : null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white flex items-center gap-3">
            <RiBrainLine className="text-accent-purple" />
            Brain View
          </h1>
          <p className="text-surface-500 dark:text-[#C9D1D9] text-sm mt-1 opacity-90">
            Drag nodes, connect ideas, and explore your knowledge graph
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic..."
            className="input !h-10 !text-sm w-56"
          />
          <button onClick={handleSearchFocus} className="btn-secondary">Focus</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-[10px] uppercase font-bold tracking-wider text-surface-600 dark:text-[#C9D1D9]">
        {Object.entries(STATUS_COLORS).map(([status, cols]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: cols.bg }} />
            {status.replace('_', ' ')}
          </span>
        ))}
        <span className="text-surface-500 dark:text-[#94A3B8]">Drag from node handle to create connection</span>
        {connectingFrom && (
          <span className="text-accent-cyan">Connecting from: {connectingTopic?.title || connectingFrom}</span>
        )}
      </div>

      {/* Graph canvas */}
      <div className="card overflow-hidden" style={{ height: '600px' }}>
        {topics.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center font-medium opacity-90">
              <p className="text-4xl mb-3">🧠</p>
              <p className="text-surface-600 dark:text-[#C9D1D9]">No topics yet — add topics in the Skill Tree</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onEdgeClick={onEdgeClick}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2.5}
            panOnDrag={isSpacePressed ? [0, 1] : [1]}
            selectionOnDrag={false}
            nodesConnectable
            connectionLineType={ConnectionLineType.Straight}
            connectionLineStyle={{ stroke: '#e5e7eb', strokeDasharray: '4 4', strokeWidth: 1.5 }}
            attributionPosition="bottom-right"
          >
            <Background color="#1a1f38" gap={24} size={1} />
            <Controls
              style={{
                background: '#1a1f38',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
              }}
            />
            <MiniMap
              nodeColor={(node) => {
                const status = node.data?.status || 'not_started';
                return (STATUS_COLORS[status] || STATUS_COLORS.not_started).bg;
              }}
              style={{
                background: '#13162a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
              }}
              maskColor="rgba(13,15,26,0.7)"
              pannable
              zoomable
            />
          </ReactFlow>
        )}
      </div>

      <Modal
        isOpen={Boolean(statusEditorTopic)}
        onClose={() => setStatusEditorTopicId(null)}
        title={statusEditorTopic ? `Change Status: ${statusEditorTopic.title}` : 'Change Status'}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Choose a new status for this topic.</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((status) => {
              const isActive = statusEditorTopic?.status === status.value;
              const color = STATUS_COLORS[status.value] || STATUS_COLORS.not_started;
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleUpdateStatus(status.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive ? 'border-white/50 text-white' : 'border-white/10 text-gray-300 hover:border-white/30'
                  }`}
                  style={{
                    background: isActive ? `${color.bg}66` : `${color.bg}22`,
                  }}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default BrainViewPage;
