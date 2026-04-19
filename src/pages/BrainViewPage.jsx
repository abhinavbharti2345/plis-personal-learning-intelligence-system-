// BrainViewPage.jsx — Interactive 2D knowledge graph using React Flow
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopics } from '../context/TopicContext';
import { getEffectiveStatus } from '../utils/clarityEngine';
import AppLayout from '../components/layout/AppLayout';
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RiBrainLine } from 'react-icons/ri';

// ── Status → color mapping ──────────────────────────────────────────────────
const STATUS_COLORS = {
  strong:      { bg: '#10b981', border: '#059669', text: '#ecfdf5' },
  learning:    { bg: '#f59e0b', border: '#d97706', text: '#fffbeb' },
  not_started: { bg: '#374151', border: '#4b5563', text: '#d1d5db' },
  weak:        { bg: '#ef4444', border: '#dc2626', text: '#fef2f2' },
};

// ── Custom node style builder ────────────────────────────────────────────────
const buildNode = (topic, index, totalInLevel) => {
  const status = getEffectiveStatus(topic);
  const colors = STATUS_COLORS[status] || STATUS_COLORS.not_started;
  const angle  = (index / Math.max(totalInLevel, 1)) * 2 * Math.PI;
  const radius = topic.parentId ? 180 : 80;
  const cx     = radius * Math.cos(angle) + (topic.parentId ? 400 : 400);
  const cy     = radius * Math.sin(angle) + (topic.parentId ? 300 : 300);

  return {
    id:   topic.id,
    type: 'default',
    position: { x: cx + index * 60, y: cy + (topic.parentId ? 100 : 0) },
    data:  { label: topic.title },
    style: {
      background:   colors.bg,
      border:       `2px solid ${colors.border}`,
      color:        colors.text,
      borderRadius: '12px',
      padding:      '10px 14px',
      fontSize:     '12px',
      fontWeight:   600,
      fontFamily:   'Inter, sans-serif',
      boxShadow:    `0 4px 24px ${colors.bg}40`,
      minWidth:     '120px',
      textAlign:    'center',
      cursor:       'pointer',
    },
  };
};

const BrainViewPage = () => {
  const { topics } = useTopics();
  const navigate   = useNavigate();

  // Build nodes and edges from topics
  const { initialNodes, initialEdges } = useMemo(() => {
    // Position nodes using a simple layered layout
    const nodeMap = {};
    const levelMap = {};

    // Compute depth
    const getDepth = (topic, memo = {}) => {
      if (memo[topic.id] !== undefined) return memo[topic.id];
      if (!topic.parentId) { memo[topic.id] = 0; return 0; }
      const parent = topics.find((t) => t.id === topic.parentId);
      if (!parent) { memo[topic.id] = 0; return 0; }
      memo[topic.id] = getDepth(parent, memo) + 1;
      return memo[topic.id];
    };

    topics.forEach((t) => {
      const depth = getDepth(t, {});
      if (!levelMap[depth]) levelMap[depth] = [];
      levelMap[depth].push(t);
    });

    const nodes = [];
    Object.entries(levelMap).forEach(([level, levelTopics]) => {
      const y = Number(level) * 200 + 60;
      const xStep = Math.max(700 / Math.max(levelTopics.length, 1), 160);
      const startX = (700 - xStep * (levelTopics.length - 1)) / 2;

      levelTopics.forEach((topic, i) => {
        const status = getEffectiveStatus(topic);
        const colors = STATUS_COLORS[status] || STATUS_COLORS.not_started;
        nodes.push({
          id: topic.id,
          position: { x: startX + i * xStep, y },
          data: { label: topic.title },
          style: {
            background:   colors.bg,
            border:       `2px solid ${colors.border}`,
            color:        colors.text,
            borderRadius: '12px',
            padding:      '10px 16px',
            fontSize:     '12px',
            fontWeight:   600,
            fontFamily:   'Inter, sans-serif',
            boxShadow:    `0 4px 20px ${colors.bg}40`,
            minWidth:     '130px',
            maxWidth:     '180px',
            textAlign:    'center',
            cursor:       'pointer',
          },
        });
        nodeMap[topic.id] = true;
      });
    });

    const edges = topics
      .filter((t) => t.parentId && nodeMap[t.parentId])
      .map((t) => ({
        id:     `e-${t.parentId}-${t.id}`,
        source: t.parentId,
        target: t.id,
        type:   'smoothstep',
        animated: false,
        style:  { stroke: '#4b5563', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563' },
      }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [topics]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_, node) => {
    navigate(`/topic/${node.id}`);
  }, [navigate]);

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
            Your knowledge graph — click any node to open that topic
          </p>
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
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
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
              nodeColor={(node) => node.style?.background || '#374151'}
              style={{
                background: '#13162a',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
              }}
              maskColor="rgba(13,15,26,0.7)"
            />
          </ReactFlow>
        )}
      </div>
    </AppLayout>
  );
};

export default BrainViewPage;
