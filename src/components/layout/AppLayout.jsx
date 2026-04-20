// AppLayout.jsx — 3-column layout shell
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RiMenuFoldLine, RiMenuUnfoldLine } from 'react-icons/ri';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RightSidebar from './RightSidebar';
import { useTheme } from '../../context/ThemeContext';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { theme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hideSidebarByFocus, setHideSidebarByFocus] = useState(false);

  const isDiscussRoute = location.pathname === '/discuss';
  const hideRightSidebar = isDiscussRoute;

  useEffect(() => {
    if (!isDiscussRoute) {
      setHideSidebarByFocus(false);
      return;
    }

    const handler = (event) => {
      setHideSidebarByFocus(Boolean(event?.detail));
    };

    window.addEventListener('discuss-focus-mode', handler);
    return () => window.removeEventListener('discuss-focus-mode', handler);
  }, [isDiscussRoute]);

  const hideSidebar = isDiscussRoute && hideSidebarByFocus;

  const mainOverlay = theme === 'dark'
    ? 'linear-gradient(to bottom right, rgba(148,163,184,0.08), transparent)'
    : 'linear-gradient(to bottom right, rgba(255,255,255,0.4), transparent)';

  return (
    <div className="flex h-screen overflow-hidden">
      {!hideSidebar && (
        <Sidebar collapsed={sidebarCollapsed} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto relative w-full" style={{ backgroundImage: mainOverlay }}>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl -z-10 pointer-events-none -translate-y-1/2 translate-x-1/3" />

          {isDiscussRoute && (
            <button
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="absolute top-4 left-4 z-30 w-10 h-10 rounded-xl bg-white/80 dark:bg-surface-800/70 backdrop-blur-md border border-white/70 dark:border-white/10 shadow-glass flex items-center justify-center text-surface-700 dark:text-[#C9D1D9] hover:scale-105 transition-all duration-300 ease-in-out"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              {sidebarCollapsed ? <RiMenuUnfoldLine size={18} /> : <RiMenuFoldLine size={18} />}
            </button>
          )}
          
          <div className={`${isDiscussRoute ? 'max-w-none px-4 lg:px-4 py-4' : 'max-w-6xl px-6 lg:px-10 py-8'} mx-auto animate-fade-in transition-all duration-300 ease-in-out`}>
            {children}
          </div>
        </main>
      </div>
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
};

export default AppLayout;
