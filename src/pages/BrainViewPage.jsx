// BrainViewPage.jsx — Obsidian-style interactive knowledge graph
import { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopics } from '../context/TopicContext';
import { getEffectiveStatus } from '../utils/clarityEngine';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import ReactFlow, {
  BaseEdge,
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, Handle, Position,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RiAddLine, RiBrainLine, RiNodeTree } from 'react-icons/ri';
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

const CUSTOM_STATUS_COLORS = { bg: '#334155', border: '#475569', text: '#e2e8f0' };

const formatStatusLabel = (value) => {
  if (!value) return 'Not Started';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const toStatusValue = (input) => {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
};

const getStatusColors = (status) => STATUS_COLORS[status] || CUSTOM_STATUS_COLORS;

const GraphNode = memo(({ data, selected }) => {
  const status = data.status || 'not_started';
  const colors = getStatusColors(status);
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

const buildCubicBezierPath = (x1, y1, x2, y2) => {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1},${y1} C ${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};

const BrainTreeEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const edgePath = useMemo(
    () => buildCubicBezierPath(sourceX, sourceY, targetX, targetY),
    [sourceX, sourceY, targetX, targetY]
  );

  const gradientId = useMemo(
    () => `brain-edge-gradient-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    [id]
  );

  const isDimmed = Boolean(data?.isDimmed);
  const baseOpacity = isDimmed ? 0.2 : 0.42;
  const baseWidth = isDimmed ? 1.1 : 2;
  const strokeOpacity = isHovered ? Math.min(baseOpacity + 0.35, 1) : baseOpacity;
  const strokeWidth = isHovered ? baseWidth + 1 : baseWidth;
  const glow = isDimmed
    ? 'drop-shadow(0 0 2px rgba(148, 163, 184, 0.18))'
    : 'drop-shadow(0 0 4px rgba(203, 213, 225, 0.24))';

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={22}
        style={{
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeLinecap: 'round',
          opacity: strokeOpacity,
          filter: glow,
          transition: 'stroke-width 140ms ease, opacity 140ms ease, filter 140ms ease',
        }}
      />
    </g>
  );
});

const nodeTypes = { graphNode: GraphNode };
const edgeTypes = { brainTreeEdge: BrainTreeEdge };

const GRID_WIDTH = 6;
const GRID_X_GAP = 220;
const GRID_Y_GAP = 140;
const HIERARCHY_START_X = 120;
const HIERARCHY_START_Y = 90;
const HIERARCHY_X_GAP = 250;
const HIERARCHY_Y_GAP = 170;
const HIERARCHY_CLUSTER_GAP = 320;

const fallbackPosition = (index) => {
  const row = Math.floor(index / GRID_WIDTH);
  const col = index % GRID_WIDTH;
  return {
    x: col * GRID_X_GAP + 80,
    y: row * GRID_Y_GAP + 80,
  };
};

const BrainViewPage = () => {
  const {
    topics,
    addTopic,
    editTopic,
    updateTopicPositions,
    getTopicById,
  } = useTopics();
  const navigate = useNavigate();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [search, setSearch] = useState('');
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [statusEditorTopicId, setStatusEditorTopicId] = useState(null);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodePosition, setNewNodePosition] = useState(null);
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [autoConnectToSelected, setAutoConnectToSelected] = useState(true);
  const [newNodeStatus, setNewNodeStatus] = useState('not_started');
  const [newNodeCustomStatusInput, setNewNodeCustomStatusInput] = useState('');
  const [statusEditorCustomInput, setStatusEditorCustomInput] = useState('');

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

    return topics
      .filter((topic) => topic.parentId && topic.parentId !== topic.id && topicMap.has(topic.parentId))
      .map((topic) => {
        const source = topic.parentId;
        const target = topic.id;
        const edgeKey = `${source}->${target}`;

        if (seen.has(edgeKey)) return null;
        seen.add(edgeKey);

        const isDimmed = neighborSet
          ? !(neighborSet.has(source) && neighborSet.has(target))
          : false;

        return {
          id: `tree-${source}-${target}`,
          source,
          target,
          type: 'brainTreeEdge',
          animated: false,
          data: {
            isDimmed,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isDimmed ? '#64748b' : '#e2e8f0',
          },
        };
      })
      .filter(Boolean);
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

  const onNodeClick = useCallback(() => {
    // Left-click is reserved for grab/pan behavior; selection is on right-click.
  }, []);

  const onNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault();
    navigate(`/topic/${node.id}`);
  }, [navigate]);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    // First right-click selects node; right-click again opens status editor.
    if (selectedNodeId !== node.id) {
      setSelectedNodeId(node.id);
      return;
    }

    setStatusEditorTopicId(node.id);
  }, [selectedNodeId]);

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

    const parentId = params.source;
    const childId = params.target;

    // Prevent cycles: do not allow assigning parent to one of its descendants.
    const childrenByParent = new Map();
    topics.forEach((topic) => {
      childrenByParent.set(topic.id, []);
    });
    topics.forEach((topic) => {
      if (topic.parentId && topic.parentId !== topic.id && childrenByParent.has(topic.parentId)) {
        childrenByParent.get(topic.parentId).push(topic.id);
      }
    });

    const stack = [childId];
    const seen = new Set();
    let wouldCreateCycle = false;

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || seen.has(current)) continue;
      seen.add(current);
      if (current === parentId) {
        wouldCreateCycle = true;
        break;
      }
      const children = childrenByParent.get(current) || [];
      children.forEach((id) => stack.push(id));
    }

    if (wouldCreateCycle) {
      toast.error('Cannot create a cycle in hierarchy');
      setConnectingFrom(null);
      return;
    }

    try {
      await editTopic(childId, { parentId });
      toast.success('Parent-child relation updated');
    } catch {
      toast.error('Failed to update hierarchy relation');
    } finally {
      setConnectingFrom(null);
    }
  }, [topics, editTopic]);

  const onConnectStart = useCallback((_, info) => {
    setConnectingFrom(info?.nodeId || null);
  }, []);

  const onConnectEnd = useCallback(() => {
    setConnectingFrom(null);
  }, []);

  const onEdgeClick = useCallback(async (_, edge) => {
    if (!edge?.source || !edge?.target) return;
    const ok = window.confirm('Remove this parent-child relation?');
    if (!ok) return;
    try {
      await editTopic(edge.target, { parentId: null });
    } catch {
      // Keep interaction non-blocking if update fails.
    }
  }, [editTopic]);

  const onMoveStart = useCallback(() => {
    setIsPanning(true);
  }, []);

  const onMoveEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  const toFlowPosition = useCallback((clientX, clientY) => {
    if (reactFlowInstance?.screenToFlowPosition) {
      return reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
    }
    if (reactFlowInstance?.project) {
      return reactFlowInstance.project({ x: clientX, y: clientY });
    }
    return fallbackPosition(topics.length);
  }, [reactFlowInstance, topics.length]);

  const openCreateNodeModal = useCallback((position = null) => {
    setNewNodeTitle('');
    setNewNodePosition(position);
    setAutoConnectToSelected(Boolean(selectedNodeId));
    setNewNodeStatus('not_started');
    setNewNodeCustomStatusInput('');
    setShowCreateNodeModal(true);
  }, [selectedNodeId]);

  const onPaneDoubleClick = useCallback((event) => {
    const position = toFlowPosition(event.clientX, event.clientY);
    openCreateNodeModal(position);
  }, [openCreateNodeModal, toFlowPosition]);

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

  const handleCreateNode = useCallback(async () => {
    const title = newNodeTitle.trim();
    if (!title) {
      toast.error('Please enter a topic title');
      return;
    }

    const fallback = fallbackPosition(topics.length);
    const position = newNodePosition || fallback;

    try {
      const newTopicId = await addTopic({
        title,
        parentId: autoConnectToSelected && selectedNodeId ? selectedNodeId : null,
        status: newNodeStatus || 'not_started',
        position: {
          x: Math.round(position.x),
          y: Math.round(position.y),
        },
      });

      setShowCreateNodeModal(false);
      setNewNodeTitle('');
      setNewNodeStatus('not_started');
      setNewNodeCustomStatusInput('');
      setNewNodePosition(null);
      setSelectedNodeId(newTopicId);
      toast.success('Topic node created');
    } catch {
      toast.error('Failed to create topic node');
    }
  }, [
    addTopic,
    autoConnectToSelected,
    newNodePosition,
    newNodeStatus,
    newNodeTitle,
    selectedNodeId,
    topics.length,
  ]);

  const statusOptions = useMemo(() => {
    const map = new Map(STATUS_OPTIONS.map((item) => [item.value, item]));

    topics.forEach((topic) => {
      const status = toStatusValue(topic.status);
      if (!status || map.has(status)) return;
      map.set(status, {
        value: status,
        label: formatStatusLabel(status),
      });
    });

    const normalizedNewNodeStatus = toStatusValue(newNodeStatus);
    if (normalizedNewNodeStatus && !map.has(normalizedNewNodeStatus)) {
      map.set(normalizedNewNodeStatus, {
        value: normalizedNewNodeStatus,
        label: formatStatusLabel(normalizedNewNodeStatus),
      });
    }

    return Array.from(map.values());
  }, [topics, newNodeStatus]);

  const handleAddCustomStatusForNewNode = useCallback(() => {
    const value = toStatusValue(newNodeCustomStatusInput);
    if (!value) {
      toast.error('Enter a valid custom status name');
      return;
    }
    setNewNodeStatus(value);
    setNewNodeCustomStatusInput('');
  }, [newNodeCustomStatusInput]);

  const handleAddCustomStatusForEditor = useCallback(() => {
    const value = toStatusValue(statusEditorCustomInput);
    if (!value) {
      toast.error('Enter a valid custom status name');
      return;
    }
    handleUpdateStatus(value);
    setStatusEditorCustomInput('');
  }, [statusEditorCustomInput, handleUpdateStatus]);

  const handleFormatHierarchy = useCallback(async () => {
    if (topics.length === 0) return;

    const byId = new Map();
    topics.forEach((topic) => {
      byId.set(topic.id, topic);
    });

    const currentPositionById = new Map();
    topics.forEach((topic, index) => {
      currentPositionById.set(topic.id, topic.position || fallbackPosition(index));
    });

    const sortByCurrentX = (aId, bId) => {
      const aPos = currentPositionById.get(aId);
      const bPos = currentPositionById.get(bId);
      const xDiff = (aPos?.x ?? 0) - (bPos?.x ?? 0);
      if (xDiff !== 0) return xDiff;
      const aTitle = byId.get(aId)?.title || '';
      const bTitle = byId.get(bId)?.title || '';
      return aTitle.localeCompare(bTitle);
    };

    const layoutParentById = new Map();
    topics.forEach((topic) => {
      const parentId = topic.parentId;
      if (parentId && parentId !== topic.id && byId.has(parentId)) {
        layoutParentById.set(topic.id, parentId);
      } else {
        layoutParentById.set(topic.id, null);
      }
    });

    const childrenByParent = new Map();
    const roots = [];

    topics.forEach((topic) => {
      childrenByParent.set(topic.id, []);
    });

    topics.forEach((topic) => {
      const parentId = layoutParentById.get(topic.id);
      if (parentId && parentId !== topic.id && byId.has(parentId)) {
        const children = childrenByParent.get(parentId) || [];
        children.push(topic.id);
        childrenByParent.set(parentId, children);
      } else {
        roots.push(topic.id);
      }
    });

    roots.sort(sortByCurrentX);
    childrenByParent.forEach((childIds, parentId) => {
      childrenByParent.set(parentId, childIds.sort(sortByCurrentX));
    });

    const nextPositions = new Map();
    const placed = new Set();
    let clusterStartX = HIERARCHY_START_X;

    const layoutSubtree = (rootId) => {
      if (!rootId || placed.has(rootId)) return;

      const localLevels = [];
      const queue = [{ id: rootId, level: 0 }];
      let queueIndex = 0;

      while (queueIndex < queue.length) {
        const current = queue[queueIndex];
        queueIndex += 1;

        if (!current || placed.has(current.id)) continue;
        placed.add(current.id);

        if (!localLevels[current.level]) {
          localLevels[current.level] = [];
        }
        localLevels[current.level].push(current.id);

        const children = childrenByParent.get(current.id) || [];
        children.forEach((childId) => {
          if (!placed.has(childId)) {
            queue.push({ id: childId, level: current.level + 1 });
          }
        });
      }

      if (localLevels.length === 0) return;

      let maxLevelWidth = 1;
      localLevels.forEach((ids, levelIndex) => {
        maxLevelWidth = Math.max(maxLevelWidth, ids.length);
        ids.forEach((id, itemIndex) => {
          nextPositions.set(id, {
            x: clusterStartX + itemIndex * HIERARCHY_X_GAP,
            y: HIERARCHY_START_Y + levelIndex * HIERARCHY_Y_GAP,
          });
        });
      });

      clusterStartX += maxLevelWidth * HIERARCHY_X_GAP + HIERARCHY_CLUSTER_GAP;
    };

    roots.forEach((rootId) => layoutSubtree(rootId));

    const leftovers = topics
      .map((topic) => topic.id)
      .filter((id) => !placed.has(id))
      .sort(sortByCurrentX);

    leftovers.forEach((id) => layoutSubtree(id));

    setNodes((prev) =>
      prev.map((node) => {
        const nextPos = nextPositions.get(node.id);
        if (!nextPos) return node;
        return { ...node, position: nextPos };
      })
    );

    const updates = topics
      .map((topic, index) => {
        const nextPos = nextPositions.get(topic.id);
        if (!nextPos) return null;

        const curr = topic.position || fallbackPosition(index);
        const currentX = Math.round(curr.x);
        const currentY = Math.round(curr.y);
        const nextX = Math.round(nextPos.x);
        const nextY = Math.round(nextPos.y);

        if (currentX === nextX && currentY === nextY) {
          return null;
        }

        return {
          topicId: topic.id,
          position: { x: nextX, y: nextY },
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      toast.success('Hierarchy is already up to date');
      reactFlowInstance?.fitView({ padding: 0.24, duration: 550 });
      return;
    }

    try {
      await updateTopicPositions(updates);

      toast.success('Nodes formatted into hierarchical layout');
      reactFlowInstance?.fitView({ padding: 0.24, duration: 550 });
    } catch {
      toast.error('Failed to save hierarchical layout');
    }
  }, [topics, setNodes, updateTopicPositions, reactFlowInstance]);

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
          <p className="text-surface-500 dark:text-[#E2E8F0] text-sm mt-1">
            Drag nodes, connect ideas, and explore your knowledge graph
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFormatHierarchy}
            className="btn-secondary !w-9 !h-9 !p-0 !rounded-full inline-flex items-center justify-center"
            type="button"
            title="Format hierarchy"
            aria-label="Format hierarchy"
          >
            <RiNodeTree size={16} />
          </button>
          <button
            onClick={() => openCreateNodeModal()}
            className="btn-secondary !w-9 !h-9 !p-0 !rounded-full inline-flex items-center justify-center"
            type="button"
            title="Create new node"
            aria-label="Create new node"
          >
            <RiAddLine size={16} />
          </button>
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
      <div className="flex flex-wrap gap-4 mb-4 text-[10px] uppercase font-bold tracking-wider text-surface-600 dark:text-[#E2E8F0]">
        {Object.entries(STATUS_COLORS).map(([status, cols]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: cols.bg }} />
            {status.replace('_', ' ')}
          </span>
        ))}
        <span className="text-surface-500 dark:text-[#CBD5E1]">Drag from node handle to create connection</span>
        <span className="text-surface-500 dark:text-[#CBD5E1]">Right-click selects node (right-click again to change status)</span>
        <span className="text-surface-500 dark:text-[#CBD5E1]">Left-drag to grab and move the view</span>
        {connectingFrom && (
          <span className="text-accent-cyan">Connecting from: {connectingTopic?.title || connectingFrom}</span>
        )}
      </div>

      {/* Graph canvas */}
      <div className="card overflow-hidden" style={{ height: '600px' }}>
        <style>{`
          .brain-view-canvas .react-flow__pane {
            cursor: ${isPanning ? 'grabbing' : 'grab'};
          }

          .brain-view-canvas .react-flow__node {
            cursor: ${isSpacePressed ? 'grab' : 'move'};
          }
        `}</style>
        {topics.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center font-medium opacity-90">
              <p className="text-4xl mb-3">🧠</p>
              <p className="text-surface-600 dark:text-[#C9D1D9]">No topics yet — add topics in the Skill Tree</p>
            </div>
          </div>
        ) : (
          <ReactFlow
            className="brain-view-canvas"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onEdgeClick={onEdgeClick}
            onPaneDoubleClick={onPaneDoubleClick}
            onMoveStart={onMoveStart}
            onMoveEnd={onMoveEnd}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={2.5}
            panOnDrag={[0, 1]}
            selectionOnDrag={false}
            nodesDraggable={!isSpacePressed}
            nodesConnectable
            connectionLineType={ConnectionLineType.Bezier}
            connectionLineStyle={{
              stroke: '#cbd5e1',
              strokeDasharray: '4 4',
              strokeWidth: 1.8,
              strokeLinecap: 'round',
              opacity: 0.55,
            }}
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
                return getStatusColors(status).bg;
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
        isOpen={showCreateNodeModal}
        onClose={() => setShowCreateNodeModal(false)}
        title="Create Topic Node"
      >
        <div className="space-y-3">
          <input
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            className="input"
            placeholder="Topic title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateNode();
              }
            }}
            autoFocus
          />

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-400">Status</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => {
                const isActive = newNodeStatus === status.value;
                const colors = getStatusColors(status.value);
                return (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setNewNodeStatus(status.value)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isActive ? 'border-white/60 text-white' : 'border-white/10 text-gray-300 hover:border-white/30'
                    }`}
                    style={{
                      background: isActive ? `${colors.bg}88` : `${colors.bg}33`,
                    }}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={newNodeCustomStatusInput}
                onChange={(e) => setNewNodeCustomStatusInput(e.target.value)}
                className="input !h-8 !text-xs"
                placeholder="Custom status name"
              />
              <button
                type="button"
                className="btn-secondary !h-8 !px-3 !py-1 !text-xs !font-medium whitespace-nowrap !rounded-lg"
                onClick={handleAddCustomStatusForNewNode}
              >
                Add Custom Status
              </button>
            </div>
          </div>

          {selectedNodeId && (
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={autoConnectToSelected}
                onChange={(e) => setAutoConnectToSelected(e.target.checked)}
              />
              Connect to selected node: {getTopicById(selectedNodeId)?.title || selectedNodeId}
            </label>
          )}

          <p className="text-xs text-gray-400">
            Tip: double-click empty canvas to create a node at that position.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreateNodeModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCreateNode}
            >
              Create Node
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(statusEditorTopic)}
        onClose={() => setStatusEditorTopicId(null)}
        title={statusEditorTopic ? `Change Status: ${statusEditorTopic.title}` : 'Change Status'}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Choose a new status for this topic.</p>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((status) => {
              const isActive = statusEditorTopic?.status === status.value;
              const color = getStatusColors(status.value);
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => handleUpdateStatus(status.value)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
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

          <div className="flex items-center gap-2 pt-1">
            <input
              value={statusEditorCustomInput}
              onChange={(e) => setStatusEditorCustomInput(e.target.value)}
              className="input !h-8 !text-xs"
              placeholder="Custom status name"
            />
            <button
              type="button"
              className="btn-secondary !h-8 !px-3 !py-1 !text-xs !font-medium whitespace-nowrap !rounded-lg"
              onClick={handleAddCustomStatusForEditor}
            >
              Add Custom Status
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default BrainViewPage;
