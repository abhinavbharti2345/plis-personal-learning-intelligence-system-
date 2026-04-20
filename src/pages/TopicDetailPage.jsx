// TopicDetailPage.jsx — Full topic view: notes + performance logging + suggestions
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import {
  getNote, saveNote, uploadNoteAttachment, removeNoteAttachment,
} from '../services/noteService';
import { runClarityEngine, getAccuracy, getEffectiveStatus } from '../utils/clarityEngine';
import { formatMinutes, timeAgo } from '../utils/dateUtils';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import TopicForm from '../components/topic/TopicForm';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiTimeLine, RiCheckboxLine, RiEditLine,
  RiMessage3Line, RiSaveLine, RiAddLine, RiBarChartLine,
} from 'react-icons/ri';

const STATUS_CONFIG = {
  strong:      { label: 'Strong',      cls: 'badge-green' },
  learning:    { label: 'Learning',    cls: 'badge-amber' },
  not_started: { label: 'Not Started', cls: 'badge-gray' },
  weak:        { label: 'Weak',        cls: 'badge-red' },
};

const TopicDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    getTopicById,
    getChildTopics,
    getConnectedTopics,
    connectTopics,
    disconnectTopics,
    editTopic,
    logSession,
    topics,
  } = useTopics();
  const navigate = useNavigate();

  const topic    = getTopicById(id);
  const children = getChildTopics(id);
  const connections = getConnectedTopics(id);
  const [connectTargetId, setConnectTargetId] = useState('');

  // Notes
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving]   = useState(false);
  const [noteLoaded, setNoteLoaded]   = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Performance logger
  const [session, setSession] = useState({ timeSpent: 0, attempted: 0, correct: 0 });
  const [logging, setLogging] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);

  // Clarity suggestions for this topic only
  const topicSuggestions = topic ? runClarityEngine([topic]) : [];

  // Load note
  useEffect(() => {
    if (!user || !id) return;
    setNoteLoaded(false);
    getNote(user.uid, id).then((n) => {
      setNoteContent(n.content || '');
      setAttachments(Array.isArray(n.attachments) ? n.attachments : []);
      setNoteLoaded(true);
    });
  }, [user, id]);

  // Auto-save note (debounced 1.5s after last keystroke)
  useEffect(() => {
    if (!noteLoaded || !user) return;
    const tid = setTimeout(async () => {
      try {
        await saveNote(user.uid, id, noteContent);
      } catch { /* silent */ }
    }, 1500);
    return () => clearTimeout(tid);
  }, [noteContent, noteLoaded, user, id]);

  const handleManualSave = async () => {
    setNoteSaving(true);
    try {
      await saveNote(user.uid, id, noteContent);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setNoteSaving(false);
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    setUploadingAttachment(true);
    try {
      const uploaded = await uploadNoteAttachment(user.uid, id, file);
      setAttachments((prev) => [...prev, uploaded]);
      toast.success('Attachment uploaded');
    } catch {
      toast.error('Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAttachmentRemove = async (attachmentId) => {
    if (!user) return;
    try {
      await removeNoteAttachment(user.uid, id, attachmentId);
      setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
      toast.success('Attachment removed');
    } catch {
      toast.error('Failed to remove attachment');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleLogSession = async () => {
    if (session.attempted > 0 && session.correct > session.attempted) {
      toast.error('Correct answers cannot exceed attempted');
      return;
    }
    if (session.timeSpent === 0 && session.attempted === 0) {
      toast.error('Enter at least time spent or questions attempted');
      return;
    }
    setLogging(true);
    try {
      await logSession(id, {
        timeSpent: Number(session.timeSpent),
        attempted: Number(session.attempted),
        correct:   Number(session.correct),
      });
      setSession({ timeSpent: 0, attempted: 0, correct: 0 });
      toast.success('Session logged! ✅');
    } catch {
      toast.error('Failed to log session');
    } finally {
      setLogging(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await editTopic(id, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleConnectTopic = async () => {
    if (!connectTargetId || connectTargetId === id) return;
    try {
      await connectTopics(id, connectTargetId);
      toast.success('Connection created');
      setConnectTargetId('');
    } catch {
      toast.error('Failed to create connection');
    }
  };

  const handleDisconnectTopic = async (targetId) => {
    try {
      await disconnectTopics(id, targetId);
      toast.success('Connection removed');
    } catch {
      toast.error('Failed to remove connection');
    }
  };

  const connectionCandidateOptions = topics.filter((t) => {
    if (t.id === id) return false;
    return !connections.some((c) => c.id === t.id);
  });

  if (!topic) {
    return (
      <AppLayout>
        <div className="text-center py-24">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-gray-300 font-medium">Topic not found</p>
          <button onClick={() => navigate('/tree')} className="btn-secondary mt-4">
            Back to Skill Tree
          </button>
        </div>
      </AppLayout>
    );
  }

  const accuracy    = getAccuracy(topic);
  const effStatus   = getEffectiveStatus(topic);
  const statusConf  = STATUS_CONFIG[effStatus] || STATUS_CONFIG.not_started;

  return (
    <AppLayout>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost mb-4 -ml-1 text-sm"
      >
        <RiArrowLeftLine size={16} /> Back
      </button>

      {/* Topic header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`badge ${statusConf.cls}`}>{statusConf.label}</span>
              {topic.tags?.map((tag) => (
                <span key={tag} className="badge-gray text-xs">{tag}</span>
              ))}
            </div>
            <h1 className="text-2xl font-extrabold text-gray-100 mb-1">{topic.title}</h1>
            {topic.description && (
              <p className="text-gray-400 text-sm">{topic.description}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              Last updated {timeAgo(topic.lastUpdated)}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/discuss')}
              className="btn-secondary text-sm px-3"
              title="Open discuss space"
            >
              <RiMessage3Line size={16} />
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="btn-secondary text-sm px-3"
              title="Edit topic"
            >
              <RiEditLine size={16} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-white/5">
          <div className="text-center">
            <p className="text-xl font-bold text-brand-300">{formatMinutes(topic.timeSpent || 0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Time Spent</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-200">{topic.questionsAttempted || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Questions</p>
          </div>
          <div className="text-center">
            <p className={`text-xl font-bold ${
              accuracy === null ? 'text-gray-500' :
              accuracy < 60 ? 'text-accent-red' : 'text-accent-green'
            }`}>
              {accuracy !== null ? `${accuracy}%` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Accuracy</p>
          </div>
        </div>

        {/* Status override */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 self-center mr-1">Mark as:</span>
           {['not_started', 'learning', 'weak', 'strong'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`text-xs px-3 py-1 rounded-lg border transition-all ${
                topic.status === s
                  ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                  : 'border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Clarity suggestions for this topic */}
      {topicSuggestions.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-accent-amber/5 border border-accent-amber/20">
          <p className="text-sm font-semibold text-accent-amber mb-2">⚙️ Clarity Engine Suggestions</p>
          {topicSuggestions.map((s, i) => (
            <p key={i} className="text-sm text-gray-300">{s.message}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes editor */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-100">📝 Notes</h2>
                <button
                  onClick={() => navigate(`/notes?topicId=${id}`)}
                  className="btn-ghost text-xs"
                  title="Open full notes workspace"
                >
                  Open Notes Workspace
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="btn-secondary text-xs cursor-pointer">
                  {uploadingAttachment ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachment}
                  />
                </label>
                <button
                  onClick={handleManualSave}
                  disabled={noteSaving}
                  className="btn-ghost text-xs gap-1.5"
                  title="Save notes"
                >
                  <RiSaveLine size={14} />
                  {noteSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea
              id="topic-notes"
              className="textarea w-full h-80 font-mono text-sm leading-relaxed"
              placeholder={`Write your notes for "${topic.title}"...\n\nTip: Summarize key concepts, formulas, and your understanding here.`}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-2">Auto-saved • {noteContent.length} characters</p>

            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-xs font-semibold text-gray-400 mb-2">Topic Files</p>
              {attachments.length === 0 ? (
                <p className="text-xs text-gray-500">No files uploaded for this topic yet.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-surface-700/50">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-300 hover:text-brand-200 flex-1 truncate"
                      >
                        {file.name}
                      </a>
                      <span className="text-[11px] text-gray-400">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => handleAttachmentRemove(file.id)}
                        className="text-[11px] px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-red-300 hover:border-red-400/30"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Log session */}
          <div className="card p-5">
            <h2 className="font-bold text-gray-100 mb-4 flex items-center gap-2">
              <RiBarChartLine className="text-brand-400" /> Log Session
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time Spent (minutes)</label>
                <input
                  id="session-time"
                  type="number"
                  min="0"
                  className="input text-sm"
                  placeholder="e.g. 30"
                  value={session.timeSpent || ''}
                  onChange={(e) => setSession((s) => ({ ...s, timeSpent: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Questions Attempted</label>
                <input
                  id="session-attempted"
                  type="number"
                  min="0"
                  className="input text-sm"
                  placeholder="e.g. 20"
                  value={session.attempted || ''}
                  onChange={(e) => setSession((s) => ({ ...s, attempted: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Correct Answers</label>
                <input
                  id="session-correct"
                  type="number"
                  min="0"
                  className="input text-sm"
                  placeholder="e.g. 15"
                  value={session.correct || ''}
                  onChange={(e) => setSession((s) => ({ ...s, correct: e.target.value }))}
                />
              </div>
              {session.attempted > 0 && (
                <div className="px-3 py-2 rounded-lg bg-surface-700 text-center">
                  <p className="text-xs text-gray-500">This session accuracy</p>
                  <p className={`text-lg font-bold ${
                    Math.round((session.correct / session.attempted) * 100) < 60
                      ? 'text-accent-red' : 'text-accent-green'
                  }`}>
                    {Math.round((Number(session.correct) / Number(session.attempted)) * 100)}%
                  </p>
                </div>
              )}
              <button
                id="log-session-btn"
                onClick={handleLogSession}
                disabled={logging}
                className="btn-primary w-full justify-center text-sm"
              >
                {logging ? 'Logging...' : '✅ Log Session'}
              </button>
            </div>
          </div>

          {/* Child topics */}
          {children.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-gray-100 mb-3">🌿 Sub-Topics</h2>
              <div className="space-y-1.5">
                {children.map((child) => {
                  const childAcc = getAccuracy(child);
                  return (
                    <div
                      key={child.id}
                      onClick={() => navigate(`/topic/${child.id}`)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-700 cursor-pointer transition-all"
                    >
                      <span className={`status-${child.status}`} />
                      <span className="text-sm text-gray-300 flex-1 truncate">{child.title}</span>
                      {childAcc !== null && (
                        <span className={`text-xs ${childAcc < 60 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {childAcc}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-bold text-gray-100 mb-3">🕸️ Connections</h2>

            <div className="flex gap-2 mb-3">
              <select
                className="input text-sm"
                value={connectTargetId}
                onChange={(e) => setConnectTargetId(e.target.value)}
              >
                <option value="">Connect to topic...</option>
                {connectionCandidateOptions.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                ))}
              </select>
              <button className="btn-secondary text-sm" onClick={handleConnectTopic}>
                <RiAddLine size={14} />
                Connect
              </button>
            </div>

            {connections.length === 0 ? (
              <p className="text-xs text-gray-500">No connections yet. Add one to build your knowledge graph.</p>
            ) : (
              <div className="space-y-1.5">
                {connections.map((linked) => (
                  <div
                    key={linked.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700/60"
                  >
                    <button
                      onClick={() => navigate(`/topic/${linked.id}`)}
                      className="text-sm text-gray-200 hover:text-white text-left flex-1 truncate"
                    >
                      {linked.title}
                    </button>
                    <button
                      onClick={() => handleDisconnectTopic(linked.id)}
                      className="text-xs px-2 py-1 rounded border border-white/10 text-gray-400 hover:text-red-300 hover:border-red-400/30"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Topic">
        <TopicForm onClose={() => setShowEdit(false)} editTopic={topic} />
      </Modal>
    </AppLayout>
  );
};

export default TopicDetailPage;
