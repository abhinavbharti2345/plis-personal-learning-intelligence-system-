// ChatPage.jsx — Topic-based real-time chat via Firebase Realtime DB
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import { sendMessage, subscribeToChat } from '../services/chatService';
import { subscribeToFriends } from '../services/friendService';
import AppLayout from '../components/layout/AppLayout';
import { RiSendPlane2Line, RiMessage3Line, RiArrowLeftLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const formatTime = (ts) => {
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts) : new Date();
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const ChatPage = () => {
  const { topicId } = useParams();
  const { user }    = useAuth();
  const { getTopicById } = useTopics();
  const navigate    = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const topic       = getTopicById(topicId);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [friends, setFriends]   = useState([]);
  const bottomRef = useRef(null);

  const isStudyGroup = topicId === 'general';
  const selectedFriendUid = searchParams.get('friend') || '';
  const selectedFriend = friends.find((f) => f.uid === selectedFriendUid) || null;

  const roomId = (() => {
    if (!isStudyGroup) return topicId;
    if (!selectedFriendUid || !user?.uid) return null;
    const [a, b] = [user.uid, selectedFriendUid].sort();
    return `dm_${a}_${b}`;
  })();

  useEffect(() => {
    if (!isStudyGroup || !user?.uid) return;
    const unsub = subscribeToFriends(user.uid, (list) => {
      setFriends(list);
    });
    return () => unsub();
  }, [isStudyGroup, user?.uid]);

  useEffect(() => {
    if (!isStudyGroup) return;
    if (!selectedFriendUid) return;
    const exists = friends.some((f) => f.uid === selectedFriendUid);
    if (!exists && friends.length > 0) {
      const next = new URLSearchParams(searchParams);
      next.delete('friend');
      setSearchParams(next);
    }
  }, [isStudyGroup, selectedFriendUid, friends, searchParams, setSearchParams]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }
    setMessages([]);
    const unsub = subscribeToChat(roomId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => unsub();
  }, [roomId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!roomId) return;
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(roomId, {
        uid:         user.uid,
        displayName: user.displayName || user.email,
        text:        text.trim(),
      });
      setText('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isOwn = (msg) => msg.uid === user?.uid;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost -ml-1 text-sm">
          <RiArrowLeftLine size={16} /> Back
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-100 flex items-center gap-2">
            <RiMessage3Line className="text-accent-cyan" />
            {isStudyGroup
              ? (selectedFriend ? `${selectedFriend.displayName} — Chat` : 'Study Groups — Chat')
              : (topic ? `${topic.title} — Chat` : 'General — Chat')}
          </h1>
          <p className="text-xs text-gray-500">
            {isStudyGroup ? 'Choose a friend to start a private study conversation' : 'Topic-based discussion room'}
          </p>
        </div>
      </div>

      {/* Chat card */}
      <div className="card flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {isStudyGroup && (
          <div className="border-b border-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 font-bold">Choose Friend</p>
            {friends.length === 0 ? (
              <p className="text-sm text-gray-400">Add friends first to start chatting.</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {friends.map((friend) => {
                  const active = friend.uid === selectedFriendUid;
                  return (
                    <button
                      key={friend.uid}
                      onClick={() => setSearchParams({ friend: friend.uid })}
                      className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                        active
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-surface-700/50 text-gray-300 border-white/10 hover:bg-surface-700'
                      }`}
                    >
                      {friend.displayName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!roomId && isStudyGroup && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-gray-300 text-sm font-semibold">Select a friend to start chatting</p>
              </div>
            </div>
          )}
          {roomId && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-gray-400 text-sm">
                  No messages yet. Start the discussion!
                </p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isOwn(msg) ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                              ${isOwn(msg) ? 'bg-brand-600' : 'bg-surface-600'}`}>
                {(msg.displayName || '?')[0].toUpperCase()}
              </div>

              {/* Bubble */}
              <div className={`max-w-xs lg:max-w-md ${isOwn(msg) ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isOwn(msg) && (
                  <p className="text-[11px] text-gray-500 px-1">{msg.displayName}</p>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn(msg)
                    ? 'bg-brand-600 text-white rounded-br-sm'
                    : 'bg-surface-700 text-gray-200 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
                <p className="text-[10px] text-gray-600 px-1">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/5 p-4">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <input
              id="chat-input"
              className="input flex-1 text-sm"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
              autoFocus
            />
            <button
              id="chat-send-btn"
              type="submit"
              className="btn-primary px-4"
              disabled={sending || !text.trim() || !roomId}
            >
              <RiSendPlane2Line size={18} />
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatPage;
