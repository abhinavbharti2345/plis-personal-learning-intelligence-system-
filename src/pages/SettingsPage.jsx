import AppLayout from '../components/layout/AppLayout';
import { useTheme } from '../context/ThemeContext';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold text-[#1F2937] dark:text-white mb-2">Settings</h1>
        <p className="text-[#4B5563] dark:text-[#C9D1D9] text-sm mb-6">Manage your preferences</p>

        <div className="card p-6 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-[#1F2937] dark:text-white">Theme</p>
            <p className="text-sm text-surface-500 dark:text-[#C9D1D9] mt-1">Current: {theme === 'dark' ? 'Dark' : 'Light'}</p>
          </div>
          <button onClick={toggleTheme} className="btn-primary px-4 py-2 text-sm">
            Toggle Theme
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
