import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold text-[#1F2937] dark:text-white mb-2">Profile</h1>
        <p className="text-[#4B5563] dark:text-[#C9D1D9] text-sm mb-6">Your account information</p>

        <div className="card p-6">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-surface-500 dark:text-[#8B949E] mb-1">Name</p>
              <p className="text-lg font-bold text-[#1F2937] dark:text-white">{user?.displayName || 'User'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-surface-500 dark:text-[#8B949E] mb-1">Email</p>
              <p className="text-base font-medium text-[#1F2937] dark:text-white break-all">{user?.email || 'No email'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-surface-500 dark:text-[#8B949E] mb-1">UID</p>
              <p className="text-xs font-mono text-surface-600 dark:text-[#C9D1D9] break-all">{user?.uid}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
