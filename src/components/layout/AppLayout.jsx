// AppLayout.jsx — 3-column layout shell
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import RightSidebar from './RightSidebar';

const AppLayout = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto relative w-full" style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(255,255,255,0.4), transparent)' }}>
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl -z-10 pointer-events-none -translate-y-1/2 translate-x-1/3" />
          
          <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <RightSidebar />
    </div>
  );
};

export default AppLayout;
