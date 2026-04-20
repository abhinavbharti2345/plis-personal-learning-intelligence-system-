import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import {
  getNote,
  saveNote,
  subscribeToUserNotes,
  migrateLegacyNotesForUser,
  listDeletedNotesByTopic,
  restoreKnowledgeByTopic,
} from '../services/noteService';
import {
  subscribeFilesByTopic,
  uploadTopicFile,
  softDeleteFile,
  listDeletedFilesByTopic,
} from '../services/fileService';

const formatTimestamp = (value) => {
  if (!value) return 'Never';

  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }

  if (typeof value === 'number') {
    return new Date(value).toLocaleString();
  }

  return String(value);
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const NotesPage = () => {
  const { user } = useAuth();
  const { topics, loading: topicsLoading } = useTopics();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [activeNote, setActiveNote] = useState(null);
  const [notesIndex, setNotesIndex] = useState({});
  const [files, setFiles] = useState([]);
  const [deletedInfo, setDeletedInfo] = useState({ notes: 0, files: 0 });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);

  useEffect(() => {
    if (topics.length === 0) {
      setSelectedTopicId('');
      return;
    }

    const queryTopicId = searchParams.get('topicId');
    const preferred = topics.some((t) => t.id === queryTopicId)
      ? queryTopicId
      : topics[0].id;

    setSelectedTopicId((current) => current || preferred);
  }, [topics, searchParams]);

  useEffect(() => {
    if (!user || topics.length === 0) return;
    migrateLegacyNotesForUser(user.uid, topics.map((t) => t.id)).catch(() => {
      // Migration is best effort and should not block usage.
    });
  }, [user, topics]);

  useEffect(() => {
    if (!user) return undefined;
    return subscribeToUserNotes(user.uid, (allNotes) => {
      const map = allNotes.reduce((acc, note) => {
        if (!acc[note.topicId]) {
          acc[note.topicId] = note;
        }
        return acc;
      }, {});
      setNotesIndex(map);
    });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedTopicId) {
      setActiveNote(null);
      setNoteContent('');
      setFiles([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingNote(true);

    getNote(user.uid, selectedTopicId)
      .then((note) => {
        if (cancelled) return;
        setActiveNote(note);
        setNoteContent(note.content || '');
      })
      .finally(() => {
        if (!cancelled) setLoadingNote(false);
      });

    const unsubFiles = subscribeFilesByTopic(user.uid, selectedTopicId, (list) => {
      if (!cancelled) setFiles(list);
    });

    Promise.all([
      listDeletedNotesByTopic(user.uid, selectedTopicId),
      listDeletedFilesByTopic(user.uid, selectedTopicId),
    ]).then(([deletedNotes, deletedFiles]) => {
      if (!cancelled) {
        setDeletedInfo({ notes: deletedNotes.length, files: deletedFiles.length });
      }
    });

    return () => {
      cancelled = true;
      unsubFiles();
    };
  }, [user, selectedTopicId]);

  useEffect(() => {
    if (!user || !selectedTopicId) return undefined;

    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        const saved = await saveNote(user.uid, selectedTopicId, noteContent);
        setActiveNote((prev) => ({ ...(prev || {}), ...saved }));
      } catch {
        // Silent autosave failure; manual save can recover.
      } finally {
        setSaving(false);
      }
    }, 1300);

    return () => clearTimeout(timer);
  }, [user, selectedTopicId, noteContent]);

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return topics;

    return topics.filter((topic) => {
      if (topic.title.toLowerCase().includes(q)) return true;
      if (topic.tags?.some((tag) => tag.toLowerCase().includes(q))) return true;
      return notesIndex[topic.id]?.content?.toLowerCase().includes(q);
    });
  }, [topics, search, notesIndex]);

  const selectTopic = (topicId) => {
    setSelectedTopicId(topicId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('topicId', topicId);
      return next;
    });
  };

  const handleManualSave = async () => {
    if (!user || !selectedTopicId) return;
    setSaving(true);
    try {
      const saved = await saveNote(user.uid, selectedTopicId, noteContent);
      setActiveNote((prev) => ({ ...(prev || {}), ...saved }));
      toast.success('Note saved');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || !selectedTopicId) return;

    setUploading(true);
    try {
      await uploadTopicFile(user.uid, selectedTopicId, file, activeNote?.id || null);
      toast.success('File uploaded');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSoftDeleteFile = async (fileId) => {
    if (!user) return;
    try {
      await softDeleteFile(user.uid, fileId);
      toast.success('File moved to recovery');
    } catch {
      toast.error('Failed to remove file');
    }
  };

  const handleRestoreKnowledge = async () => {
    if (!user || !selectedTopicId) return;
    try {
      await restoreKnowledgeByTopic(user.uid, selectedTopicId);
      const [deletedNotes, deletedFiles] = await Promise.all([
        listDeletedNotesByTopic(user.uid, selectedTopicId),
        listDeletedFilesByTopic(user.uid, selectedTopicId),
      ]);
      setDeletedInfo({ notes: deletedNotes.length, files: deletedFiles.length });
      toast.success('Recovered deleted note resources');
    } catch {
      toast.error('Failed to recover resources');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-9rem)]">
        <aside className="card p-4 md:w-80 md:min-w-80 overflow-hidden">
          <p className="text-sm font-bold text-[#1F2937] dark:text-white mb-3">Skill Tree Topics</p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input text-sm mb-3"
            placeholder="Search topic or note..."
          />

          <div className="overflow-y-auto h-[calc(100%-4.5rem)] space-y-2 pr-1">
            {topicsLoading ? (
              <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9]">Loading topics...</p>
            ) : filteredTopics.length === 0 ? (
              <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9]">No topics found.</p>
            ) : (
              filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => selectTopic(topic.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all border ${
                    selectedTopicId === topic.id
                      ? 'bg-brand-500/15 border-brand-400 text-brand-700 dark:text-brand-300'
                      : 'bg-white/40 dark:bg-surface-800/40 border-white/30 dark:border-white/10 text-[#1F2937] dark:text-[#C9D1D9] hover:bg-white/70 dark:hover:bg-surface-700/60'
                  }`}
                >
                  <p className="text-sm font-semibold truncate">{topic.title}</p>
                  <p className="text-[11px] opacity-80 mt-1">{topic.status.replace('_', ' ')}</p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="card p-5 flex-1 flex flex-col overflow-hidden transition-all duration-200">
          {!selectedTopic ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <p className="text-3xl mb-2">📝</p>
                <p className="text-sm text-[#4B5563] dark:text-[#C9D1D9]">Select a topic to start writing notes.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">{selectedTopic.title}</h1>
                  <p className="text-xs text-[#6B7280] dark:text-[#C9D1D9]">
                    Last updated: {formatTimestamp(activeNote?.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleManualSave} className="btn-secondary text-xs" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  {(deletedInfo.notes > 0 || deletedInfo.files > 0) && (
                    <button onClick={handleRestoreKnowledge} className="btn-ghost text-xs">
                      Restore Deleted ({deletedInfo.notes + deletedInfo.files})
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="textarea w-full flex-1 min-h-[260px] text-sm"
                placeholder="No notes yet. Start building your knowledge base for this topic..."
                disabled={loadingNote}
              />

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-[#1F2937] dark:text-white">Topic Files</p>
                  <label className="btn-secondary text-xs cursor-pointer">
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>

                {files.length === 0 ? (
                  <p className="text-xs text-[#6B7280] dark:text-[#C9D1D9]">No files uploaded for this topic yet.</p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 rounded-lg bg-white/40 dark:bg-surface-700/50 px-3 py-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 truncate text-sm text-brand-600 dark:text-brand-300 hover:underline"
                        >
                          {file.fileName}
                        </a>
                        <span className="text-[11px] text-[#6B7280] dark:text-[#C9D1D9]">{formatFileSize(file.fileSize)}</span>
                        <button
                          onClick={() => handleSoftDeleteFile(file.id)}
                          className="text-[11px] px-2 py-1 border border-white/10 rounded text-[#6B7280] dark:text-[#C9D1D9] hover:text-red-300 hover:border-red-400/30"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default NotesPage;
