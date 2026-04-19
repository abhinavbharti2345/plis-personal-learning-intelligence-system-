// TopicDetailPage.jsx — Full topic view: notes + performance logging + suggestions
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import { getNote, saveNote } from '../services/noteService';
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
  const { getTopicById, getChildTopics, editTopic, logSession, topics } = useTopics();
  const navigate = useNavigate();

  const topic    = getTopicById(id);
  const children = getChildTopics(id);

  // Notes
  const [noteContent, setNoteContent] = useState('');
  const [noteSaving, setNoteSaving]   = useState(false);
  const [noteLoaded, setNoteLoaded]   = useState(false);

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
              onClick={() => navigate(`/chat/${id}`)}
              className="btn-secondary text-sm px-3"
              title="Open topic chat"
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
              <h2 className="font-bold text-gray-100">📝 Notes</h2>
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
            <textarea
              id="topic-notes"
              className="textarea w-full h-80 font-mono text-sm leading-relaxed"
              placeholder={`Write your notes for "${topic.title}"...\n\nTip: Summarize key concepts, formulas, and your understanding here.`}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-2">Auto-saved • {noteContent.length} characters</p>
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
