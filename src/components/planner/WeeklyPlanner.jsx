import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTopics } from '../../context/TopicContext';
import { subscribeToWeekly, addWeeklyPlan, updateWeeklyPlan, deleteWeeklyPlan } from '../../services/plannerService';
import { generatePlan } from '../../services/aiService';
import { RiCloseFill } from 'react-icons/ri';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyPlanner = () => {
  const { user } = useAuth();
  const { topics } = useTopics();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiDrafts, setAiDrafts] = useState([]);
  
  // Current Week Start (Monday) String
  const currentWeekStart = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToWeekly(user.uid, currentWeekStart, (list) => {
      setPlans(list);
      setLoading(false);
    });
    return () => unsub();
  }, [user, currentWeekStart]);

  const addAssignment = async (dayString, topicId) => {
    if (!topicId) return;
    await addWeeklyPlan(user.uid, { weekStartDate: currentWeekStart, day: dayString, topicId, completed: false });
  };
  
  const toggleCompleted = async (plan) => {
    await updateWeeklyPlan(user.uid, plan.id, { completed: !plan.completed });
  };

  const removePlan = async (planId) => {
    await deleteWeeklyPlan(user.uid, planId);
  };

  const handleGenerateWeekly = async (regenerate = false) => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generatePlan('weekly', topics, {
        weekStartDate: currentWeekStart,
        currentPlans: plans,
      });
      setAiDrafts(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setAiError(error.message || 'Failed to generate weekly plan.');
    } finally {
      setAiLoading(false);
    }
  };

  const applyWeeklyDrafts = async () => {
    if (!aiDrafts.length || !user) return;
    try {
      for (const draft of aiDrafts) {
        const day = DAYS.includes(draft.day) ? draft.day : 'Monday';
        const topicId = topics.some((t) => t.id === draft.topicId) ? draft.topicId : topics[0]?.id;
        if (!topicId) continue;
        await addWeeklyPlan(user.uid, {
          weekStartDate: currentWeekStart,
          day,
          topicId,
          completed: false,
        });
      }
      setAiDrafts([]);
      toast.success('AI weekly plan applied');
    } catch {
      toast.error('Failed to apply AI weekly plan');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary text-xs" onClick={() => handleGenerateWeekly(false)} disabled={aiLoading}>
          {aiLoading ? 'Generating...' : 'Generate Plan'}
        </button>
        <button className="btn-ghost text-xs" onClick={() => handleGenerateWeekly(true)} disabled={aiLoading}>Regenerate</button>
        {aiDrafts.length > 0 && <button className="btn-primary text-xs" onClick={applyWeeklyDrafts}>Apply Plan</button>}
        {aiError && <span className="text-xs text-red-400">{aiError}</span>}
      </div>

      {aiDrafts.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold text-white mb-2">AI Weekly Draft</p>
          <div className="space-y-2">
            {aiDrafts.map((draft, idx) => (
              <div key={idx} className="text-xs text-[#4B5563] dark:text-[#C9D1D9]">
                {draft.day || 'Monday'}: {draft.notes || 'Study task'}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-6 animate-fade-in">
      {DAYS.map((day) => {
        const dayPlans = plans.filter(p => p.day === day);
        return (
          <div key={day} className="card p-5 min-h-[160px] flex flex-col transition-all">
            <h3 className="font-bold text-[#1F2937] dark:text-white border-b border-[rgba(255,255,255,0.8)] dark:border-white/10 pb-2 mb-3">{day}</h3>
            
            <div className="space-y-2 mb-4 flex-1">
              {dayPlans.map(plan => {
                const topic = topics.find(t => t.id === plan.topicId);
                return (
                  <div key={plan.id} className={`p-2.5 rounded-lg border text-sm flex items-start gap-2.5 group transition-all ${
                    plan.completed ? 'bg-[rgba(255,255,255,0.4)] dark:bg-black/20 border-transparent opacity-60' : 'bg-white/60 dark:bg-surface-800/60 border-white/80 dark:border-white/10 shadow-sm'
                  }`}>
                    <input 
                      type="checkbox" 
                      className="mt-1 shrink-0 accent-[#3B82F6]" 
                      checked={plan.completed}
                      onChange={() => toggleCompleted(plan)}
                    />
                    <span className={`flex-1 leading-tight mt-0.5 ${plan.completed ? 'line-through text-[#9CA3AF]' : 'text-[#4B5563] dark:text-[#C9D1D9] font-medium'}`}>
                      {topic ? topic.title : 'Deleted Topic'}
                    </span>
                    <button onClick={() => removePlan(plan.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><RiCloseFill size={16} /></button>
                  </div>
                );
              })}
            </div>

            <select 
              className="input w-full text-xs py-2 bg-white/60 dark:bg-surface-800 border-white/80 dark:border-white/10 shadow-none text-[#4B5563] dark:text-[#C9D1D9] focus:ring-2 focus:border-brand-300"
              onChange={(e) => {
                addAssignment(day, e.target.value);
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="" disabled>+ Assign topic...</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
        );
      })}
    </div>
    </div>
  );
};
export default WeeklyPlanner;
