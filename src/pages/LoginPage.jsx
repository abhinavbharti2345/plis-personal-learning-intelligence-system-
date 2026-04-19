// LoginPage.jsx — Auth page with login/signup toggle
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import logo from '../assets/synaptiq-logo-cropped.png';

const LoginPage = () => {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]           = useState('login'); // 'login' | 'signup'
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [displayName, setName]    = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  // Already logged in
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    if (mode === 'signup' && !displayName.trim()) { toast.error('Display name is required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Welcome back! 👋');
      } else {
        await signup(email, password, displayName.trim());
        toast.success('Account created! 🎉');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.code === 'auth/user-not-found'     ? 'No account found with this email'
                : err.code === 'auth/wrong-password'     ? 'Incorrect password'
                : err.code === 'auth/email-already-in-use' ? 'Email already in use'
                : err.code === 'auth/invalid-email'      ? 'Invalid email address'
                : 'Authentication failed. Check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-cyan/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/70 dark:bg-white/10 shadow-glow-brand mb-4 animate-float overflow-hidden ring-1 ring-white/40 dark:ring-white/15">
            <img src={logo} alt="Synaptiq logo" className="w-full h-full object-cover" />
          </div>
            <h1 className="text-3xl font-extrabold text-gradient mb-1">Synaptiq</h1>
          <p className="text-gray-400 text-sm">Personal Learning Intelligence System</p>
        </div>

        {/* Card */}
        <div className="card p-7">
          {/* Mode toggle */}
          <div className="flex bg-surface-700/60 rounded-xl p-1 mb-6">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                id={`auth-${m}-tab`}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-brand-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Your Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Abhinav"
                  value={displayName}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <input
                id="auth-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={mode === 'login'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                </button>
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              className="btn-primary w-full mt-2 justify-center"
              disabled={loading}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : null}
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {['🧠 Knowledge Engine', '🌳 Skill Tree', '⚙️ Clarity Engine', '🤝 Collaboration'].map((f) => (
            <span key={f} className="badge-gray text-xs">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
