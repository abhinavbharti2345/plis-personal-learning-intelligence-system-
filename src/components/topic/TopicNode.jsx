// TopicNode.jsx — Recursive skill tree node with expand/collapse
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowRightSLine, RiArrowDownSLine, RiAddLine,
  RiEditLine, RiDeleteBinLine,
} from 'react-icons/ri';
import { useTopics } from '../../context/TopicContext';
import { getAccuracy, getEffectiveStatus } from '../../utils/clarityEngine';
import { formatMinutes } from '../../utils/dateUtils';
import Modal from '../ui/Modal';
import TopicForm from './TopicForm';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  strong:      { dot: 'status-strong',      label: 'Strong',      ring: 'border-accent-green/40' },
  learning:    { dot: 'status-learning',     label: 'Learning',    ring: 'border-accent-amber/40' },
  not_started: { dot: 'status-not_started',  label: 'Not Started', ring: 'border-gray-600/40' },
  weak:        { dot: 'status-weak',         label: 'Weak',        ring: 'border-accent-red/40' },
};

const formatStatusLabel = (value) => {
  if (!value) return 'Not Started';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
};

const TopicNode = ({ topic, depth = 0 }) => {
  const { getChildTopics, removeTopic } = useTopics();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(depth === 0);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const children     = getChildTopics(topic.id);
  const hasChildren  = children.length > 0;
  const accuracy     = getAccuracy(topic);
  const effStatus    = getEffectiveStatus(topic);
  const statusConf   = STATUS_CONFIG[effStatus]
    || { dot: 'bg-slate-400 w-2 h-2 rounded-full', label: formatStatusLabel(effStatus), ring: 'border-slate-500/40' };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${topic.title}"? This cannot be undone.`)) return;
    try {
      await removeTopic(topic.id);
      toast.success('Topic deleted');
    } catch {
      toast.error('Failed to delete topic');
    }
  };

  return (
    <div className={`animate-slide-in-left`} style={{ animationDelay: `${depth * 50}ms` }}>
      {/* Node row */}
      <div
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer
                    transition-all duration-200 hover:border-brand-500/30 hover:bg-[#ECE7DE]/90 dark:hover:bg-surface-700/50
                    ${statusConf.ring} bg-[#F5F1E8]/85 dark:bg-surface-800/60
                    ${depth > 0 ? 'ml-6 mt-1.5' : 'mt-2'}`}
        style={{ marginLeft: depth === 0 ? 0 : depth * 20 }}
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-5 h-5 flex items-center justify-center text-[#7B8596] dark:text-gray-500 hover:text-[#4B5563] dark:hover:text-gray-300 flex-shrink-0"
        >
          {hasChildren
            ? (expanded ? <RiArrowDownSLine size={16} /> : <RiArrowRightSLine size={16} />)
            : <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] dark:bg-gray-600 mx-auto" />
          }
        </button>

        {/* Status dot */}
        <span className={`${statusConf.dot} flex-shrink-0`} />

        {/* Title — click to navigate */}
        <div
          className="flex-1 min-w-0"
          onClick={() => navigate(`/topic/${topic.id}`)}
        >
          <p className="text-sm font-medium text-[#374151] dark:text-gray-200 truncate group-hover:text-[#1F2937] dark:group-hover:text-white">
            {topic.title}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-[#6B7280] dark:text-gray-500">{statusConf.label}</span>
            {accuracy !== null && (
              <span className={`text-[11px] font-medium ${accuracy < 60 ? 'text-accent-red' : 'text-accent-green'}`}>
                {accuracy}% acc
              </span>
            )}
            {topic.timeSpent > 0 && (
              <span className="text-[11px] text-[#6B7280] dark:text-gray-600">{formatMinutes(topic.timeSpent)}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        {topic.tags?.length > 0 && (
          <div className="hidden sm:flex gap-1">
            {topic.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="badge-gray text-[10px] px-1.5">{tag}</span>
            ))}
          </div>
        )}

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#6B7280] dark:text-gray-500 hover:text-accent-cyan hover:bg-[#E7E0D3] dark:hover:bg-surface-600"
            title="Add child topic"
          >
            <RiAddLine size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
            className="w-6 h-6 flex items-center justify-center rounded text-[#6B7280] dark:text-gray-500 hover:text-brand-400 hover:bg-[#E7E0D3] dark:hover:bg-surface-600"
            title="Edit topic"
          >
            <RiEditLine size={14} />
          </button>
          <button
            onClick={handleDelete}
            className="w-6 h-6 flex items-center justify-center rounded text-[#6B7280] dark:text-gray-500 hover:text-accent-red hover:bg-[#E7E0D3] dark:hover:bg-surface-600"
            title="Delete topic"
          >
            <RiDeleteBinLine size={14} />
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="border-l border-white/5 ml-8">
          {children.map((child) => (
            <TopicNode key={child.id} topic={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Add child modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Sub-Topic">
        <TopicForm onClose={() => setShowAddModal(false)} defaultParentId={topic.id} />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Topic">
        <TopicForm onClose={() => setShowEditModal(false)} editTopic={topic} />
      </Modal>
    </div>
  );
};

export default TopicNode;
