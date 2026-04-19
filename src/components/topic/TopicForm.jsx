// TopicForm.jsx — Create/Edit topic modal form
import { useState, useEffect } from 'react';
import { useTopics } from '../../context/TopicContext';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', dot: 'bg-gray-500' },
  { value: 'learning',    label: 'Learning',    dot: 'bg-accent-amber' },
  { value: 'strong',      label: 'Strong',      dot: 'bg-accent-green' },
];

const TopicForm = ({ onClose, editTopic = null, defaultParentId = null }) => {
  const { addTopic, editTopic: updateTopic, topics } = useTopics();

  const [form, setForm] = useState({
    title:       editTopic?.title || '',
    description: editTopic?.description || '',
    parentId:    editTopic?.parentId || defaultParentId || '',
    status:      editTopic?.status || 'not_started',
    tags:        editTopic?.tags?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const data = {
        title:       form.title.trim(),
        description: form.description.trim(),
        parentId:    form.parentId || null,
        status:      form.status,
        tags:        form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (editTopic) {
        await updateTopic(editTopic.id, data);
        toast.success('Topic updated');
      } else {
        await addTopic(data);
        toast.success('Topic created');
      }
      onClose();
    } catch (err) {
      toast.error('Failed to save topic');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Available parent topics (exclude self)
  const parentOptions = topics.filter((t) => t.id !== editTopic?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Topic Title <span className="text-red-400">*</span>
        </label>
        <input
          id="topic-title"
          className="input"
          placeholder="e.g. Dynamic Programming"
          value={form.title}
          onChange={set('title')}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
        <textarea
          id="topic-description"
          className="textarea h-24"
          placeholder="Brief description of this topic..."
          value={form.description}
          onChange={set('description')}
        />
      </div>

      {/* Parent topic */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Parent Topic</label>
        <select
          id="topic-parent"
          className="input"
          value={form.parentId}
          onChange={set('parentId')}
        >
          <option value="">— Root (no parent) —</option>
          {parentOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Status</label>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, status: s.value }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                form.status === s.value
                  ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                  : 'border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">
          Tags <span className="text-gray-600">(comma separated)</span>
        </label>
        <input
          id="topic-tags"
          className="input"
          placeholder="e.g. algorithms, trees, graphs"
          value={form.tags}
          onChange={set('tags')}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          id="topic-form-submit"
          className="btn-primary flex-1"
          disabled={saving}
        >
          {saving ? 'Saving...' : editTopic ? 'Update Topic' : 'Create Topic'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TopicForm;
