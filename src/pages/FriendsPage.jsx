// FriendsPage.jsx — Friends management page
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { searchUserByEmail, addFriendBidirectional, subscribeToFriends, getUserData } from '../services/friendService';
import toast from 'react-hot-toast';
import AppLayout from '../components/layout/AppLayout';
import { RiSearchLine, RiUserAddLine, RiUserLine, RiMailLine, RiCheckLine } from 'react-icons/ri';

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Friends list state
  const [friends, setFriends] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Load current user data
  useEffect(() => {
    if (!user) return;
    
    const loadUserData = async () => {
      try {
        const userData = await getUserData(user.uid);
        setCurrentUserData(userData);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, [user]);

  // Subscribe to friends list
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToFriends(user.uid, (friendsList) => {
      setFriends(friendsList);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    
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
        setSearchResult(null);
      } else if (result.uid === user.uid) {
        setSearchError('You cannot add yourself');
        setSearchResult(null);
      } else {
        // Check if already friends
        const isFriend = friends.some(f => f.uid === result.uid);
        setSearchResult({ ...result, isFriend });
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Error searching for user');
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  };

  // Handle add friend
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
    } catch (error) {
      console.error('Error adding friend:', error);
      if (error.message.includes('already friends')) {
        toast.error('Already friends with this user');
      } else {
        toast.error('Error adding friend');
      }
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-[#1F2937] dark:text-white mb-2">Friends</h1>
          <p className="text-[#4B5563] dark:text-[#C9D1D9] text-base">Connect with other learners and collaborate on your learning journey</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-[#1F2937] dark:text-white mb-4 flex items-center gap-2">
                <RiSearchLine size={24} />
                Add Friend
              </h2>

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1F2937] dark:text-white mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="friend@example.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-[#1F2937] dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <RiSearchLine size={18} />
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Error */}
              {searchError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40">
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-400">{searchError}</p>
                </div>
              )}

              {/* Search Result */}
              {searchResult && (
                <div className="mt-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-900/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400">
                      <RiUserLine size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-[#1F2937] dark:text-white">{searchResult.displayName}</p>
                      <p className="text-sm text-[#4B5563] dark:text-[#C9D1D9]">{searchResult.email}</p>
                    </div>
                  </div>

                  {searchResult.isFriend ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <RiCheckLine size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Already friends</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddFriend(searchResult)}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <RiUserAddLine size={16} />
                      Add Friend
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Friends List */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-xl font-bold text-[#1F2937] dark:text-white mb-4 flex items-center gap-2">
                <RiUserLine size={24} />
                Friends ({friends.length})
              </h2>

              {friends.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
                  <p className="text-3xl mb-3">👥</p>
                  <p className="text-[#1F2937] dark:text-white font-bold text-lg">No friends yet</p>
                  <p className="text-[#4B5563] dark:text-[#C9D1D9] text-sm mt-2">Search and add friends to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                          <RiUserLine size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[#1F2937] dark:text-white">{friend.displayName}</p>
                          <div className="flex items-center gap-1 text-xs text-[#4B5563] dark:text-[#C9D1D9]">
                            <RiMailLine size={12} />
                            {friend.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-surface-500 dark:text-[#8B949E]">
                        Connected
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FriendsPage;
