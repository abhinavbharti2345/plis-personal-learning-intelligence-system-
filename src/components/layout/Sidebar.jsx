// Sidebar.jsx — Main navigation sidebar styled for light glassmorphism
import { NavLink, useNavigate } from 'react-router-dom';
import {
  RiDashboardLine, RiNodeTree, RiBrainLine, RiQuillPenLine,
  RiMessage3Line, RiLogoutBoxLine, RiSettings3Line, RiUser3Line,
  RiAddCircleLine, RiTimeLine, RiGroupLine, RiLayoutMasonryLine, RiCalendarCheckLine, RiTeamLine
} from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../../assets/synaptiq-logo-cropped.png';

const NAV_ITEMS = [
  { to: '/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
  { to: '/tree',      icon: RiNodeTree,      label: 'Skill Tree' },
  { to: '/brain',     icon: RiBrainLine,     label: 'Brain View' },
  { to: '/planner',   icon: RiCalendarCheckLine, label: 'Planner' },
  { to: '/notes',     icon: RiLayoutMasonryLine, label: 'Notes' },
  { to: '/reflection',icon: RiQuillPenLine,  label: 'Reflection' },
  { to: '/chat/general', icon: RiGroupLine,  label: 'Study Groups' },
  { to: '/friends',   icon: RiTeamLine,      label: 'Friends' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <aside className="w-64 h-full flex flex-col bg-[rgba(255,255,255,0.7)] dark:bg-surface-800/35 backdrop-blur-xl border-r border-[rgba(255,255,255,0.8)] dark:border-white/15 shadow-[0_8px_32px_rgba(31,38,135,0.08)] dark:shadow-none shrink-0 transition-colors duration-300">
      {/* Header Logo */}
      <div className="flex items-center gap-3 px-6 py-6 font-bold tracking-tight text-[#1F2937] dark:text-white border-b border-[rgba(255,255,255,0.8)] dark:border-white/10">
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/70 dark:bg-white/10 flex flex-shrink-0 items-center justify-center shadow-glow-brand ring-1 ring-white/30 dark:ring-white/15">
          <img src={logo} alt="Synaptiq logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-extrabold text-gradient">Synaptiq</span>
          <span className="text-[10px] text-surface-500 dark:text-[#C9D1D9]">Learning System</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-surface-400 dark:text-[#C9D1D9] uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200
               ${isActive 
                 ? 'bg-[rgba(91,140,255,0.15)] shadow-[0_2px_10px_rgba(91,140,255,0.1)] text-[#3B82F6] dark:text-white border border-transparent border-l-2 border-l-[#3B82F6] dark:border-l-brand-400 rounded-r-xl rounded-l-sm' 
                 : 'text-[#4B5563] dark:text-[#AAB2BF] rounded-xl hover:bg-[rgba(255,255,255,0.8)] dark:hover:bg-[rgba(255,255,255,0.04)] hover:text-[#1F2937] dark:hover:text-white'}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-white/40 space-y-3">
        <button 
          onClick={() => navigate('/tree')}
          className="w-full h-11 flex justify-center items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-purple text-white font-semibold rounded-xl text-sm shadow-glow-brand hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <RiAddCircleLine size={18} />
          New Topic
        </button>
        
        <button 
          onClick={() => navigate('/tree')} // In a full app, this might open a global logger modal
          className="w-full h-11 flex justify-center items-center gap-2 bg-white/70 hover:bg-white text-surface-700 font-semibold rounded-xl text-sm border border-white/60 shadow-sm transition-all duration-200"
        >
          <RiTimeLine size={18} />
          Log Study Session
        </button>
        
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-surface-500 hover:text-accent-red hover:bg-white/50 rounded-xl transition-all"
          >
            <RiLogoutBoxLine size={16} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
