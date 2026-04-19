// SkillTreePage.jsx — Hierarchical topic tree with add/search
import { useState, useMemo } from 'react';
import { useTopics } from '../context/TopicContext';
import TopicNode from '../components/topic/TopicNode';
import Modal from '../components/ui/Modal';
import TopicForm from '../components/topic/TopicForm';
import AppLayout from '../components/layout/AppLayout';
import { RiAddLine, RiSearchLine, RiNodeTree } from 'react-icons/ri';
import { computeStats } from '../utils/clarityEngine';

const SkillTreePage = () => {
  const { topics, getRootTopics, loading } = useTopics();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState('');

  const stats = useMemo(() => computeStats(topics), [topics]);

  // Filter by search — if searching, show flat matching list; else tree
  const filteredRoots = useMemo(() => {
    if (!search.trim()) return getRootTopics();
    const q = search.toLowerCase();
    return topics.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [search, topics, getRootTopics]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-100 flex items-center gap-3">
            <RiNodeTree className="text-brand-400" />
            Skill Tree
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {stats.total} topics · {stats.strong} strong · {stats.learning} learning · {stats.weak} weak
          </p>
        </div>
        <button
          id="add-root-topic-btn"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <RiAddLine size={18} />
          Add Topic
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          id="skill-tree-search"
          className="input pl-9"
          placeholder="Search topics or tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 text-xs text-gray-500">
        {[
          { dot: 'bg-accent-green', label: 'Strong' },
          { dot: 'bg-accent-amber', label: 'Learning' },
          { dot: 'bg-gray-500',     label: 'Not Started' },
          { dot: 'bg-accent-red',   label: 'Weak (< 60% acc)' },
        ].map(({ dot, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Tree */}
      {filteredRoots.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">🌱</p>
          {search ? (
            <>
              <p className="text-gray-300 font-medium">No topics match "{search}"</p>
              <p className="text-gray-500 text-sm mt-1">Try a different search term</p>
            </>
          ) : (
            <>
              <p className="text-gray-300 font-medium text-lg">Your skill tree is empty</p>
              <p className="text-gray-500 text-sm mt-1 mb-6">
                Create your first topic to start building your knowledge structure
              </p>
              <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
                <RiAddLine size={18} />
                Create First Topic
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="card p-4">
          {filteredRoots.map((topic) => (
            <TopicNode key={topic.id} topic={topic} depth={0} />
          ))}
        </div>
      )}

      {/* Add root topic modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create New Topic">
        <TopicForm onClose={() => setShowModal(false)} />
      </Modal>
    </AppLayout>
  );
};

export default SkillTreePage;
