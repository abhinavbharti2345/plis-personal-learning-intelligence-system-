const StatCard = ({ label, value, icon, color, sub }) => {
  const colorStyles = {
    brand:  'bg-[rgba(59,130,246,0.08)] dark:bg-blue-900/20 border border-[rgba(255,255,255,0.8)] dark:border-blue-800/30 text-[#1F2937] dark:text-blue-300',
    purple: 'bg-[rgba(139,92,246,0.08)] dark:bg-purple-900/20 border border-[rgba(255,255,255,0.8)] dark:border-purple-800/30 text-[#1F2937] dark:text-purple-300',
    green:  'bg-[rgba(34,197,94,0.08)] dark:bg-emerald-900/20 border border-[rgba(255,255,255,0.8)] dark:border-emerald-800/30 text-[#1F2937] dark:text-emerald-300',
    orange: 'bg-[rgba(249,115,22,0.08)] dark:bg-orange-900/20 border border-[rgba(255,255,255,0.8)] dark:border-orange-800/30 text-[#1F2937] dark:text-orange-300',
    red:    'bg-[rgba(244,63,94,0.08)] dark:bg-rose-900/20 border border-[rgba(255,255,255,0.8)] dark:border-rose-800/30 text-[#1F2937] dark:text-rose-300',
    cyan:   'bg-[rgba(34,211,238,0.08)] dark:bg-cyan-900/20 border border-[rgba(255,255,255,0.8)] dark:border-cyan-800/30 text-[#1F2937] dark:text-cyan-300'
  };

  const activeStyle = colorStyles[color] || colorStyles.brand;

  return (
    <div className={`rounded-2xl border p-5 shadow-[0_8px_32px_rgba(31,38,135,0.08)] dark:shadow-none hover:shadow-[0_12px_40px_rgba(31,38,135,0.12)] transition-shadow relative overflow-hidden backdrop-blur-xl ${activeStyle}`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
      {/* Decorative blurred blob in top right */}
      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/60 dark:bg-white/5 blur-2xl rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xl bg-white/80 dark:bg-surface-800/50 p-2 rounded-xl border border-[rgba(255,255,255,0.8)] dark:border-white/10 shadow-sm">{icon}</span>
        <h3 className="text-sm font-bold opacity-80 text-[#4B5563] dark:text-[#C9D1D9]">{label}</h3>
      </div>
      
      <div className="mt-1 relative z-10">
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        {(sub !== undefined && sub !== null) && (
          <p className="text-xs font-semibold text-[#9CA3AF] dark:text-[#C9D1D9] mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
