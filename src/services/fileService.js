import {
  collection, addDoc, doc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import {
  ref, uploadBytes, getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './firebase';

const filesCollection = collection(db, 'files');

const safeFileName = (name) => (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');

const normalizeFile = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const isActiveFile = (file) => !file.deletedAt;

export const listFilesByTopic = async (uid, topicId) => {
  const q = query(
    filesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(normalizeFile).filter(isActiveFile);
};

export const listDeletedFilesByTopic = async (uid, topicId) => {
  const q = query(
    filesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(q);
  return snap.docs.map(normalizeFile).filter((file) => Boolean(file.deletedAt));
};

export const subscribeFilesByTopic = (uid, topicId, callback) => {
  const q = query(
    filesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(normalizeFile).filter(isActiveFile));
  });
};

export const uploadTopicFile = async (uid, topicId, file, noteId = null) => {
  if (!uid || !topicId || !file) {
    throw new Error('uid, topicId, and file are required.');
  }

  const fileName = safeFileName(file.name);
  const storagePath = `notes/${uid}/${topicId}/${Date.now()}-${fileName}`;
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file);
  const fileUrl = await getDownloadURL(fileRef);

  const metadata = {
    userId: uid,
    topicId,
    noteId,
    fileName: file.name,
    fileUrl,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size || 0,
    storagePath,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const fileDoc = await addDoc(filesCollection, metadata);
  const created = await getDoc(fileDoc);
  return normalizeFile(created);
};

export const softDeleteFile = async (uid, fileId) => {
  const fileRef = doc(db, 'files', fileId);
  const snap = await getDoc(fileRef);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.userId !== uid) {
    throw new Error('Unauthorized file delete.');
  }

  await updateDoc(fileRef, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const restoreFile = async (uid, fileId) => {
  const fileRef = doc(db, 'files', fileId);
  const snap = await getDoc(fileRef);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.userId !== uid) {
    throw new Error('Unauthorized file restore.');
  }

  await updateDoc(fileRef, {
    deletedAt: null,
    updatedAt: serverTimestamp(),
  });
};

export const softDeleteFilesByTopic = async (uid, topicId) => {
  const q = query(
    filesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId)
  );

  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) => updateDoc(doc(db, 'files', d.id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  );
};

export const restoreFilesByTopic = async (uid, topicId) => {
  const q = query(
    filesCollection,
    where('userId', '==', uid),
    where('topicId', '==', topicId)
  );

  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) => updateDoc(doc(db, 'files', d.id), {
      deletedAt: null,
      updatedAt: serverTimestamp(),
    }))
  );
};

export const upsertLegacyFileMetadata = async (uid, topicId, legacyAttachment, noteId = null) => {
  const payload = {
    userId: uid,
    topicId,
    noteId,
    fileName: legacyAttachment.name || 'legacy-file',
    fileUrl: legacyAttachment.url || '',
    fileType: legacyAttachment.type || 'application/octet-stream',
    fileSize: legacyAttachment.size || 0,
    storagePath: legacyAttachment.path || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    legacyMigrated: true,
  };

  await addDoc(filesCollection, payload);
};
