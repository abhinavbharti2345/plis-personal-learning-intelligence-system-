import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiArrowLeftLine,
  RiFocus3Line,
  RiLayoutLeft2Line,
  RiMailLine,
  RiSearchLine,
  RiSendPlane2Line,
  RiUserAddLine,
  RiUserLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import Whiteboard from '../components/Whiteboard';
import { useAuth } from '../context/AuthContext';
import {
  addFriendBidirectional,
  getUserData,
  searchUserByEmail,
  subscribeToFriends,
} from '../services/friendService';
import { sendMessage, subscribeToChat } from '../services/chatService';

const makeChatId = (userA, userB) => [userA, userB].sort().join('_');

const formatTime = (ts) => {
  if (!ts) return '';
  const date = typeof ts === 'number'
    ? new Date(ts)
    : ts?.seconds
      ? new Date(ts.seconds * 1000)
      : new Date();

  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const DiscussPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentUserData, setCurrentUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);

  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [friendsPanelCollapsed, setFriendsPanelCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);

  const bottomRef = useRef(null);

  const activeChatId = useMemo(() => {
    if (!user?.uid || !activeFriend?.uid) return null;
    return makeChatId(user.uid, activeFriend.uid);
  }, [activeFriend?.uid, user?.uid]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('discuss-focus-mode', { detail: focusMode }));
    return () => window.dispatchEvent(new CustomEvent('discuss-focus-mode', { detail: false }));
  }, [focusMode]);

  useEffect(() => {
    if (!user?.uid) return;

    getUserData(user.uid)
      .then(setCurrentUserData)
      .catch(() => setCurrentUserData(null));
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToFriends(user.uid, (nextFriends) => {
      setFriends(nextFriends);
      setActiveFriend((prev) => {
        if (!prev) return prev;
        return nextFriends.some((friend) => friend.uid === prev.uid) ? prev : null;
      });
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return undefined;
    }

    setMessages([]);
    const unsubscribe = subscribeToChat(activeChatId, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchEmail.trim()) {
      setSearchError('Please enter an email address');
      setSearchResult(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await searchUserByEmail(searchEmail.trim());
      if (!result) {
        setSearchError('User not found');
        return;
      }
      if (result.uid === user?.uid) {
        setSearchError('You cannot add yourself');
        return;
      }
      const isFriend = friends.some((friend) => friend.uid === result.uid);
      setSearchResult({ ...result, isFriend });
    } catch {
      setSearchError('Error searching for user');
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (targetUser) => {
    try {
      if (!currentUserData) {
        toast.error('Unable to add friend. Please refresh and try again.');
        return;
      }

      await addFriendBidirectional(user.uid, currentUserData, {
        uid: targetUser.uid,
        email: targetUser.email,
        displayName: targetUser.displayName,
      });

      toast.success(`Added ${targetUser.displayName} as a friend!`);
      setSearchEmail('');
      setSearchResult(null);
      setActiveFriend(targetUser);
      setShowFriendsDrawer(false);
    } catch (error) {
      if (String(error?.message || '').includes('Already friends')) {
        toast.error('Already friends with this user');
      } else {
        toast.error('Error adding friend');
      }
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeChatId || !text.trim() || !user?.uid) return;

    setSending(true);
    try {
      await sendMessage(activeChatId, {
        senderId: user.uid,
        displayName: user.displayName || user.email,
        text: text.trim(),
      });
      setText('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (msg) => msg.senderId === user?.uid;
  const showFriendsPanel = !focusMode && !activeFriend;

  return (
    <AppLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1F2937] dark:text-white">Discuss</h1>
          <p className="text-sm text-[#4B5563] dark:text-[#C9D1D9]">Select a friend and instantly enter your shared chat + whiteboard space.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode((prev) => !prev)}
            className="btn-secondary text-sm"
          >
            <RiFocus3Line size={16} />
            {focusMode ? 'Exit Focus' : 'Focus Mode'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm">
            <RiArrowLeftLine size={16} /> Dashboard
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)] gap-4 transition-all duration-300 ease-in-out">
        {showFriendsPanel && (
          <aside className={`${friendsPanelCollapsed ? 'w-16' : 'w-[320px]'} hidden lg:flex flex-col card p-4 transition-all duration-300 ease-in-out`}>
            <div className="flex items-center justify-between mb-3">
              {!friendsPanelCollapsed && (
                <h2 className="text-lg font-bold text-[#1F2937] dark:text-white flex items-center gap-2">
                  <RiUserLine size={18} /> Friends
                </h2>
              )}
              <button
                onClick={() => setFriendsPanelCollapsed((prev) => !prev)}
                className="w-8 h-8 rounded-lg border border-white/40 dark:border-white/10 bg-white/50 dark:bg-white/5 flex items-center justify-center"
                title="Toggle friends panel"
              >
                <RiLayoutLeft2Line size={16} />
              </button>
            </div>

            {!friendsPanelCollapsed && (
              <>
                <form onSubmit={handleSearch} className="space-y-2 mb-3">
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <RiSearchLine size={16} />
                    {searching ? 'Searching...' : 'Add / Search'}
                  </button>
                </form>

                {searchError && (
                  <p className="mb-3 text-xs text-rose-600 dark:text-rose-400">{searchError}</p>
                )}

                {searchResult && (
                  <div className="mb-3 p-3 rounded-lg border border-brand-200 dark:border-brand-900/40 bg-brand-50 dark:bg-brand-900/20">
                    <p className="font-semibold text-sm text-[#1F2937] dark:text-white">{searchResult.displayName}</p>
                    <p className="text-xs text-surface-500 dark:text-[#C9D1D9] mb-2">{searchResult.email}</p>
                    {searchResult.isFriend ? (
                      <button
                        onClick={() => setActiveFriend(searchResult)}
                        className="w-full py-1.5 rounded-md text-xs font-semibold bg-white/80 dark:bg-white/10"
                      >
                        Open Discuss
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddFriend(searchResult)}
                        className="w-full py-1.5 rounded-md text-xs font-semibold bg-brand-600 text-white"
                      >
                        <span className="inline-flex items-center gap-1"><RiUserAddLine size={14} /> Add Friend</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {friends.map((friend) => (
                <button
                  key={friend.uid}
                  onClick={() => setActiveFriend(friend)}
                  className="w-full p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-white/40 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 ease-in-out text-left"
                  title={friendsPanelCollapsed ? `${friend.displayName} (${friend.email})` : undefined}
                >
                  {friendsPanelCollapsed ? (
                    <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mx-auto">
                      {friend.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-sm text-[#1F2937] dark:text-white truncate">{friend.displayName}</p>
                      <p className="text-xs text-surface-500 dark:text-[#C9D1D9] truncate inline-flex items-center gap-1"><RiMailLine size={11} />{friend.email}</p>
                    </>
                  )}
                </button>
              ))}
              {!friends.length && !friendsPanelCollapsed && (
                <p className="text-xs text-surface-500 dark:text-[#C9D1D9] text-center py-6">No friends yet</p>
              )}
            </div>
          </aside>
        )}

        {!focusMode && !activeFriend && (
          <button
            onClick={() => setShowFriendsDrawer(true)}
            className="lg:hidden fixed bottom-24 right-6 z-30 rounded-full bg-brand-600 text-white w-14 h-14 shadow-glow-brand flex items-center justify-center"
            title="Open friends"
          >
            <RiUserLine size={24} />
          </button>
        )}

        {showFriendsDrawer && !focusMode && !activeFriend && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setShowFriendsDrawer(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-[86%] max-w-sm bg-white/90 dark:bg-surface-900/95 p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[#1F2937] dark:text-white">Friends</h3>
                <button className="btn-ghost text-sm" onClick={() => setShowFriendsDrawer(false)}>Close</button>
              </div>

              <form onSubmit={handleSearch} className="space-y-2 mb-3">
                <input
                  type="email"
                  placeholder="friend@example.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white/70 dark:bg-surface-800/60 text-sm"
                />
                <button type="submit" disabled={searching} className="w-full py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm">
                  {searching ? 'Searching...' : 'Add / Search'}
                </button>
              </form>

              <div className="space-y-2">
                {friends.map((friend) => (
                  <button
                    key={friend.uid}
                    onClick={() => {
                      setActiveFriend(friend);
                      setShowFriendsDrawer(false);
                    }}
                    className="w-full p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-left"
                  >
                    <p className="font-semibold text-sm text-[#1F2937] dark:text-white">{friend.displayName}</p>
                    <p className="text-xs text-surface-500 dark:text-[#C9D1D9]">{friend.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <section className="flex-1 card p-4 transition-all duration-300 ease-in-out h-full">
          {!activeFriend ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <p className="text-5xl mb-3">💬</p>
                <h2 className="text-2xl font-extrabold text-[#1F2937] dark:text-white mb-2">Select a friend to start discussing</h2>
                <p className="text-sm text-[#4B5563] dark:text-[#C9D1D9]">Click any friend to open your shared chat and whiteboard workspace.</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-white/30 dark:border-white/10">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-[#1F2937] dark:text-white truncate">{activeFriend.displayName}</h2>
                  <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9] truncate">{activeFriend.email}</p>
                </div>
                <button onClick={() => setActiveFriend(null)} className="btn-ghost text-sm">
                  <RiArrowLeftLine size={16} /> Back to Friends
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)] gap-3 flex-1 min-h-0 w-full transition-all duration-300 ease-in-out">
                <div className="rounded-xl border border-white/30 dark:border-white/10 overflow-hidden min-h-[420px] h-full w-full flex bg-white">
                  <Whiteboard />
                </div>

                <div className="card p-0 flex flex-col min-h-[420px] h-full overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <h3 className="font-bold text-gray-100 text-sm">Chat</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center mt-8">No messages yet. Start the discussion.</p>
                    ) : (
                      messages.map((msg) => {
                        const own = isOwnMessage(msg);
                        const name = msg.displayName || (own ? currentUserData?.displayName : activeFriend.displayName) || 'User';
                        return (
                          <div key={msg.id} className={`flex gap-2 ${own ? 'justify-end' : 'justify-start'}`}>
                            {!own && (
                              <div className="w-7 h-7 rounded-full bg-surface-700 text-gray-200 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {name[0]?.toUpperCase() || '?'}
                              </div>
                            )}

                            <div className={`max-w-[85%] ${own ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                              {!own && <p className="text-[11px] text-gray-500">{name}</p>}
                              <div className={`px-3 py-2 rounded-xl text-sm ${own ? 'bg-brand-600 text-white' : 'bg-surface-700 text-gray-100'}`}>
                                {msg.text}
                              </div>
                              <p className="text-[10px] text-gray-600">{formatTime(msg.createdAt || msg.timestamp)}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t border-white/10 p-3">
                    <form onSubmit={handleSend} className="flex items-center gap-2">
                      <input
                        className="input flex-1 text-sm"
                        placeholder="Type a message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={sending}
                      />
                      <button type="submit" className="btn-primary px-3" disabled={sending || !text.trim()}>
                        <RiSendPlane2Line size={17} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default DiscussPage;
