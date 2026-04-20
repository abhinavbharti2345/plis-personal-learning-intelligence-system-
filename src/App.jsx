// App.jsx — Root router with all routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { TopicProvider } from './context/TopicContext';
import { ReflectionProvider } from './context/ReflectionContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlannerProvider } from './context/PlannerContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import SkillTreePage   from './pages/SkillTreePage';
import TopicDetailPage from './pages/TopicDetailPage';
import BrainViewPage   from './pages/BrainViewPage';
import PlannerPage     from './pages/PlannerPage';
import ReflectionPage  from './pages/ReflectionPage';
import DiscussPage     from './pages/DiscussPage';
import NotesPage       from './pages/NotesPage';
import ProfilePage     from './pages/ProfilePage';
import SettingsPage    from './pages/SettingsPage';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TopicProvider>
            <ReflectionProvider>
              <PlannerProvider>
                {/* Toast notifications */}
                <Toaster
                  position="top-right"
                  toastOptions={{
                    style: {
                      background: '#1a1f38',
                      color: '#f3f4f6',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      fontSize: '14px',
                    },
                    success: { iconTheme: { primary: '#10b981', secondary: '#1a1f38' } },
                    error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1f38' } },
                  }}
                />

                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Protected */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/tree"      element={<ProtectedRoute><SkillTreePage /></ProtectedRoute>} />
                  <Route path="/topic/:id" element={<ProtectedRoute><TopicDetailPage /></ProtectedRoute>} />
                  <Route path="/brain"     element={<ProtectedRoute><BrainViewPage /></ProtectedRoute>} />
                  <Route path="/planner"   element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
                  <Route path="/notes"     element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
                  <Route path="/reflection" element={<ProtectedRoute><ReflectionPage /></ProtectedRoute>} />
                  <Route path="/discuss"   element={<ProtectedRoute><DiscussPage /></ProtectedRoute>} />
                  <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="/settings"  element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </PlannerProvider>
            </ReflectionProvider>
          </TopicProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
