import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  listFilesByTopic,
  uploadTopicFile,
  softDeleteFile,
  upsertLegacyFileMetadata,
  softDeleteFilesByTopic,
  restoreFilesByTopic,
} from './fileService';

const notesCollection = collection(db, 'notes');

const normalizeNote = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const isActiveNote = (note) => !note.deletedAt;

const legacyNoteRef = (uid, topicId) => doc(db, 'users', uid, 'notes', topicId);

const findLatestActiveNoteByTopic = async (uid, topicId) => {
  const q = query(
    notesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId),
    orderBy('updatedAt', 'desc'),
    limit(20)
  );

  const snap = await getDocs(q);
  const notes = snap.docs.map(normalizeNote).filter(isActiveNote);
  return notes[0] || null;
};

/**
 * Create a new note tied to topicId.
 */
export const createNote = async (uid, topicId, content = '') => {
  const payload = {
    userId: uid,
    topicId,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
  };

  const ref = await addDoc(notesCollection, payload);
  const created = await getDoc(ref);
  return normalizeNote(created);
};

/**
 * Save (upsert) note content for a topic.
 */
export const saveNote = async (uid, topicId, content) => {
  const existing = await findLatestActiveNoteByTopic(uid, topicId);
  if (!existing) {
    return createNote(uid, topicId, content);
  }

  const ref = doc(db, 'notes', existing.id);
  await updateDoc(ref, {
    content,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(ref);
  return normalizeNote(updated);
};

/**
 * Backward-compatible getter used by topic detail screen.
 */
export const getNote = async (uid, topicId) => {
  const existing = await findLatestActiveNoteByTopic(uid, topicId);
  if (existing) {
    const files = await listFilesByTopic(uid, topicId);
    return {
      id: existing.id,
      userId: existing.userId,
      topicId: existing.topicId,
      content: existing.content || '',
      createdAt: existing.createdAt || null,
      updatedAt: existing.updatedAt || null,
      attachments: files.map((file) => ({
        id: file.id,
        name: file.fileName,
        size: file.fileSize,
        type: file.fileType,
        url: file.fileUrl,
        path: file.storagePath,
        uploadedAt: file.createdAt,
      })),
    };
  }

  // Legacy fallback + migration on read.
  const legacy = await getDoc(legacyNoteRef(uid, topicId));
  if (!legacy.exists()) {
    return { topicId, content: '', updatedAt: null, attachments: [] };
  }

  const legacyData = legacy.data();
  const migrated = await createNote(uid, topicId, legacyData.content || '');
  const legacyAttachments = Array.isArray(legacyData.attachments) ? legacyData.attachments : [];

  await Promise.all(
    legacyAttachments.map((attachment) => upsertLegacyFileMetadata(uid, topicId, attachment, migrated.id))
  );

  const files = await listFilesByTopic(uid, topicId);
  return {
    id: migrated.id,
    userId: uid,
    topicId,
    content: migrated.content || '',
    createdAt: migrated.createdAt || null,
    updatedAt: migrated.updatedAt || null,
    attachments: files.map((file) => ({
      id: file.id,
      name: file.fileName,
      size: file.fileSize,
      type: file.fileType,
      url: file.fileUrl,
      path: file.storagePath,
      uploadedAt: file.createdAt,
    })),
  };
};

/**
 * Return all active notes for a user.
 */
export const listUserNotes = async (uid) => {
  const q = query(notesCollection, where('userId', '==', uid), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeNote).filter(isActiveNote);
};

export const subscribeToUserNotes = (uid, callback) => {
  const q = query(notesCollection, where('userId', '==', uid), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(normalizeNote).filter(isActiveNote));
  });
};

export const softDeleteNotesByTopic = async (uid, topicId) => {
  const q = query(notesCollection, where('userId', '==', uid), where('topicId', '==', topicId));
  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((d) => updateDoc(doc(db, 'notes', d.id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  );
};

export const listDeletedNotesByTopic = async (uid, topicId) => {
  const q = query(notesCollection, where('userId', '==', uid), where('topicId', '==', topicId), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(normalizeNote).filter((n) => Boolean(n.deletedAt));
};

export const restoreNotesByTopic = async (uid, topicId) => {
  const q = query(notesCollection, where('userId', '==', uid), where('topicId', '==', topicId));
  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((d) => updateDoc(doc(db, 'notes', d.id), {
      deletedAt: null,
      updatedAt: serverTimestamp(),
    }))
  );
};

export const softDeleteKnowledgeByTopic = async (uid, topicId) => {
  await Promise.all([
    softDeleteNotesByTopic(uid, topicId),
    softDeleteFilesByTopic(uid, topicId),
  ]);
};

export const restoreKnowledgeByTopic = async (uid, topicId) => {
  await Promise.all([
    restoreNotesByTopic(uid, topicId),
    restoreFilesByTopic(uid, topicId),
  ]);
};

/**
 * Compatibility wrappers for existing TopicDetail file UI.
 */
export const uploadNoteAttachment = async (uid, topicId, file) => {
  const active = await findLatestActiveNoteByTopic(uid, topicId);
  const noteId = active?.id || null;
  const uploaded = await uploadTopicFile(uid, topicId, file, noteId);

  return {
    id: uploaded.id,
    name: uploaded.fileName,
    size: uploaded.fileSize,
    type: uploaded.fileType,
    url: uploaded.fileUrl,
    path: uploaded.storagePath,
    uploadedAt: uploaded.createdAt,
  };
};

export const removeNoteAttachment = async (uid, _topicId, attachmentId) => {
  await softDeleteFile(uid, attachmentId);
};

export const migrateLegacyNotesForUser = async (uid, topicIds = []) => {
  const results = [];
  for (const topicId of topicIds) {
    const active = await findLatestActiveNoteByTopic(uid, topicId);
    if (active) {
      results.push({ topicId, migrated: false, reason: 'already-migrated' });
      continue;
    }

    const legacySnap = await getDoc(legacyNoteRef(uid, topicId));
    if (!legacySnap.exists()) {
      results.push({ topicId, migrated: false, reason: 'no-legacy-note' });
      continue;
    }

    const legacy = legacySnap.data();
    const created = await createNote(uid, topicId, legacy.content || '');

    const attachments = Array.isArray(legacy.attachments) ? legacy.attachments : [];
    await Promise.all(
      attachments.map((attachment) => upsertLegacyFileMetadata(uid, topicId, attachment, created.id))
    );

    results.push({ topicId, migrated: true, legacyAttachments: attachments.length });
  }

  return results;
};
