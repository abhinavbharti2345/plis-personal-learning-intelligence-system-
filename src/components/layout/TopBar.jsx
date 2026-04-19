import { useEffect, useMemo, useRef, useState } from 'react';
import { RiSearchLine, RiNotification3Line, RiCalendarLine, RiSunLine, RiMoonLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTopics } from '../../context/TopicContext';
import { usePlanner } from '../../context/PlannerContext';
import { getAccuracy } from '../../utils/clarityEngine';
import toast from 'react-hot-toast';

const TopBar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { topics } = useTopics();
  const { todayTasks } = usePlanner();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const firstName = user?.displayName ? user.displayName.split(' ')[0] : 'User';
  const fullName = user?.displayName || 'User';
  const email = user?.email || 'No email';

  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    if (!user?.uid) return [];
    try {
      return JSON.parse(localStorage.getItem(`notifications:read:${user.uid}`) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user?.uid) {
      setReadNotificationIds([]);
      return;
    }
    try {
      setReadNotificationIds(JSON.parse(localStorage.getItem(`notifications:read:${user.uid}`) || '[]'));
    } catch {
      setReadNotificationIds([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    localStorage.setItem(`notifications:read:${user.uid}`, JSON.stringify(readNotificationIds));
  }, [readNotificationIds, user?.uid]);

  const notifications = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const weakTopicNotifications = topics
      .filter((topic) => {
        const acc = getAccuracy(topic);
        return topic.status === 'weak' || (acc !== null && acc < 60);
      })
      .slice(0, 5)
      .map((topic) => ({
        id: `weak_topic_${topic.id}`,
        type: 'weak_topic',
        message: `Weak topic detected: ${topic.title}. Consider revising it today.`,
        createdAt: Date.now(),
      }));

    const missedTaskNotifications = todayTasks
      .filter((task) => {
        if (task.completed) return false;
        const [h, m] = (task.endTime || '00:00').split(':').map(Number);
        const endMinutes = (h || 0) * 60 + (m || 0);
        return endMinutes < nowMinutes;
      })
      .slice(0, 5)
      .map((task) => ({
        id: `missed_task_${task.id}`,
        type: 'missed_task',
        message: `Missed task: ${task.notes || `${task.startTime} - ${task.endTime}`}`,
        createdAt: Date.now() - 1000,
      }));

    const reminderNotifications = todayTasks
      .filter((task) => {
        if (task.completed) return false;
        const [h, m] = (task.startTime || '00:00').split(':').map(Number);
        const startMinutes = (h || 0) * 60 + (m || 0);
        const delta = startMinutes - nowMinutes;
        return delta >= 0 && delta <= 60;
      })
      .slice(0, 3)
      .map((task) => ({
        id: `reminder_${task.id}`,
        type: 'reminder',
        message: `Upcoming session at ${task.startTime}. Stay on track.`,
        createdAt: Date.now() - 2000,
      }));

    return [...weakTopicNotifications, ...missedTaskNotifications, ...reminderNotifications]
      .map((notification) => ({
        ...notification,
        read: readNotificationIds.includes(notification.id),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [topics, todayTasks, readNotificationIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlannerClick = () => {
    if (location.pathname !== '/planner') {
      navigate('/planner');
    }
  };

  const handleMarkRead = (notificationId) => {
    setReadNotificationIds((prev) => (
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    ));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="h-20 px-8 flex items-center justify-between border-b border-[rgba(255,255,255,0.8)] dark:border-white/10 bg-[rgba(255,255,255,0.7)] dark:bg-surface-900/40 backdrop-blur-xl sticky top-0 z-40 transition-colors duration-300">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white tracking-tight">
          Good morning, {firstName} 👋
        </h1>
        <p className="text-xs text-surface-500 dark:text-[#C9D1D9] font-medium">Ready to conquer your goals today?</p>
      </div>

      {/* Center Search */}
      <div className="flex-1 max-w-md mx-8 transition-transform duration-300 focus-within:scale-[1.02]">
        <div className="relative">
          <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
          <input
            type="text"
            placeholder="Search topics, notes, or friends..."
            className="w-full bg-[rgba(255,255,255,0.8)] dark:bg-surface-800/50 border border-[rgba(255,255,255,0.8)] dark:border-white/10 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-[#1F2937] dark:text-white placeholder-surface-400 shadow-[0_4px_12px_rgba(31,38,135,0.05)] backdrop-blur-md transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 border border-white hover:bg-white text-surface-600 hover:text-brand-500 transition-all shadow-sm"
        >
          {theme === 'dark' ? <RiSunLine size={20} /> : <RiMoonLine size={20} />}
        </button>
        <button
          onClick={handlePlannerClick}
          aria-label="Open planner"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 border border-white hover:bg-white text-surface-600 hover:text-brand-500 transition-all shadow-sm"
        >
          <RiCalendarLine size={20} />
        </button>
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowProfile(false);
            }}
            aria-label="Notifications"
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/50 border border-white hover:bg-white text-surface-600 hover:text-brand-500 transition-all shadow-sm"
          >
            <RiNotification3Line size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-red text-white text-[10px] font-bold flex items-center justify-center border border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-[rgba(255,255,255,0.8)] dark:border-white/10 bg-white/90 dark:bg-surface-800/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(31,38,135,0.2)] p-3 z-50 animate-fade-in">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-white/30 dark:border-white/10 mb-2">
                <p className="text-xs uppercase tracking-widest text-surface-500 dark:text-[#8B949E] font-bold">Notifications</p>
                <span className="text-[11px] font-semibold text-surface-500 dark:text-[#8B949E]">{unreadCount} unread</span>
              </div>

              {notifications.length === 0 ? (
                <p className="text-sm text-surface-500 dark:text-[#C9D1D9] p-3 text-center">No notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => {
                    const isRead = n.read;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          isRead
                            ? 'bg-white/40 dark:bg-white/5 border-white/40 dark:border-white/10'
                            : 'bg-brand-50/70 dark:bg-brand-500/10 border-brand-200/60 dark:border-brand-500/30'
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-surface-500 dark:text-[#8B949E] mb-1">{n.type.replace('_', ' ')}</p>
                        <p className="text-sm text-[#1F2937] dark:text-white leading-snug">{n.message}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Avatar + Profile Dropdown */}
        <div ref={profileRef} className="relative ml-2">
          <button
            onClick={() => {
              setShowProfile((prev) => !prev);
              setShowNotifications(false);
            }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-accent-purple p-0.5 shadow-md shadow-brand-500/20 cursor-pointer hover:scale-105 transition-transform"
            aria-label="Profile menu"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden border border-white">
              <span className="text-sm font-bold text-brand-600">{firstName[0].toUpperCase()}</span>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[rgba(255,255,255,0.8)] dark:border-white/10 bg-white/90 dark:bg-surface-800/95 backdrop-blur-xl shadow-[0_12px_40px_rgba(31,38,135,0.2)] p-4 z-50">
              <p className="text-xs uppercase tracking-widest text-surface-500 dark:text-[#8B949E] font-bold mb-3">Profile</p>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-[11px] text-surface-500 dark:text-[#8B949E] font-semibold mb-1">Name</p>
                  <p className="text-sm text-[#1F2937] dark:text-white font-bold break-words">{fullName}</p>
                </div>
                <div>
                  <p className="text-[11px] text-surface-500 dark:text-[#8B949E] font-semibold mb-1">Email</p>
                  <p className="text-sm text-[#1F2937] dark:text-white font-medium break-all">{email}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/40 dark:border-white/10 pt-3">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowProfile(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1F2937] dark:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowProfile(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-[#1F2937] dark:text-white hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                >
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-accent-red hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
