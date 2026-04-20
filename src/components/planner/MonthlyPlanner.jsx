import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToMonthly, addMonthlyGoal, updateMonthlyGoal, deleteMonthlyGoal } from '../../services/plannerService';
import { useTopics } from '../../context/TopicContext';
import { generatePlan } from '../../services/aiService';
import { RiAddFill, RiCloseFill, RiFlag2Fill } from 'react-icons/ri';
import toast from 'react-hot-toast';

const MonthlyPlanner = () => {
  const { user } = useAuth();
  const { topics } = useTopics();
  
  const [goals, setGoals] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiDrafts, setAiDrafts] = useState([]);
  
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if(!user) return;
    const unsub = subscribeToMonthly(user.uid, currentMonth, setGoals);
    return () => unsub();
  }, [user, currentMonth]);

  const [form, setForm] = useState({ title: '', topicId: '' });
  
  const handleAdd = async (e) => {
    e.preventDefault();
    if(!form.title) return;
    await addMonthlyGoal(user.uid, { month: currentMonth, title: form.title, topicId: form.topicId || null });
    setForm({ title: '', topicId: '' });
  };

  const handleGenerateMonthly = async (regenerate = false) => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generatePlan('monthly', topics, {
        month: currentMonth,
        currentPlans: goals,
      });
      setAiDrafts(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setAiError(error.message || 'Failed to generate monthly plan.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyMonthlyDrafts = async () => {
    if (!aiDrafts.length || !user) return;
    try {
      for (const draft of aiDrafts) {
        const topicId = topics.some((t) => t.id === draft.topicId) ? draft.topicId : null;
        await addMonthlyGoal(user.uid, {
          month: currentMonth,
          title: draft.title || draft.target || 'AI Monthly Goal',
          topicId,
        });
      }
      setAiDrafts([]);
      toast.success('AI monthly plan applied');
    } catch {
      toast.error('Failed to apply AI monthly plan');
    }
  };

  return (
    <div className="card p-6 min-h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-xl text-[#1F2937] dark:text-white flex items-center gap-2">
           <RiFlag2Fill className="text-brand-500" /> Monthly Goals
        </h2>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={() => handleGenerateMonthly(false)} disabled={aiLoading}>
            {aiLoading ? 'Generating...' : 'Generate Plan'}
          </button>
          <button className="btn-ghost text-xs" onClick={() => handleGenerateMonthly(true)} disabled={aiLoading}>Regenerate</button>
          {aiDrafts.length > 0 && <button className="btn-primary text-xs" onClick={applyMonthlyDrafts}>Apply Plan</button>}
        </div>
      </div>

      {aiError && <p className="text-xs text-red-400 mb-3">{aiError}</p>}

      {aiDrafts.length > 0 && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-bold text-white mb-2">AI Monthly Draft</p>
          <ul className="list-disc pl-5 text-sm text-[#4B5563] dark:text-[#C9D1D9] space-y-1">
            {aiDrafts.map((draft, idx) => (
              <li key={idx}>{draft.title || draft.target || 'Monthly goal'}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-4 mb-8 p-4 rounded-xl border border-[rgba(255,255,255,0.8)] dark:border-white/10 bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(255,255,255,0.02)]">
        <input 
          type="text" 
          placeholder="New global milestone or objective..." 
          className="input flex-1 bg-white/70 dark:bg-surface-800"
          value={form.title}
          onChange={e => setForm({...form, title: e.target.value})}
          required
        />
        <select 
          className="input w-48 bg-white/70 dark:bg-surface-800"
          value={form.topicId}
          onChange={e => setForm({...form, topicId: e.target.value})}
        >
          <option value="">No specific topic</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <button type="submit" className="btn-primary w-12 h-11 justify-center shrink-0 p-0 shadow-sm"><RiAddFill size={20} /></button>
      </form>

      {goals.length === 0 ? (
        <div className="text-center py-20 opacity-80 border border-dashed border-[rgba(255,255,255,0.6)] dark:border-white/10 rounded-2xl">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-[#4B5563] dark:text-[#C9D1D9] font-medium">No big goals set for this month.</p>
          <p className="text-xs text-[#9CA3AF] dark:text-[#C9D1D9] mt-1">Focus your efforts by creating a milestone above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
             const topic = topics.find(t => t.id === goal.topicId);
             return (
               <div key={goal.id} className="card p-5 border border-[rgba(255,255,255,0.8)] dark:border-white/10 bg-white/70 dark:bg-surface-800/60 shadow-[0_4px_24px_rgba(31,38,135,0.06)] group">
                 <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-[#1F2937] dark:text-white leading-tight">{goal.title}</h3>
                   <button onClick={() => deleteMonthlyGoal(user.uid, goal.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><RiCloseFill size={18} /></button>
                 </div>
                 {topic && (
                   <span className="text-[10px] uppercase font-bold tracking-widest text-[#9CA3AF] dark:text-[#C9D1D9] bg-white/60 dark:bg-[rgba(255,255,255,0.04)] px-2 py-1 rounded-md mb-4 block w-max mt-2 border border-white dark:border-transparent">
                     Topic: {topic.title}
                   </span>
                 )}
                 <div>
                   <div className="flex justify-between text-xs font-bold text-[#4B5563] dark:text-[#C9D1D9] mb-1.5 mt-5">
                     <span>Progress</span>
                     <span className="text-brand-500">{goal.progress}%</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" max="100" 
                     value={goal.progress}
                     onChange={(e) => updateMonthlyGoal(user.uid, goal.id, { progress: Number(e.target.value) })}
                     className="w-full accent-brand-500 cursor-pointer"
                   />
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
};
export default MonthlyPlanner;
