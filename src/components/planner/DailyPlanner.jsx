import { useState, useMemo } from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { useTopics } from '../../context/TopicContext';
import { generatePlan } from '../../services/aiService';
import { RiAddFill, RiCheckFill, RiCloseFill } from 'react-icons/ri';
import toast from 'react-hot-toast';

const DailyPlanner = () => {
  const { todayTasks, addDailyTask, updateDailyTask, deleteDailyTask, todayStr } = usePlanner();
  const { topics } = useTopics();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ topicId: '', startTime: '09:00', endTime: '10:00', notes: '' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiDrafts, setAiDrafts] = useState([]);

  const sortedTasks = useMemo(() => {
    return [...todayTasks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [todayTasks]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.topicId) return;
    await addDailyTask({ ...formData, date: todayStr });
    setShowForm(false);
    setFormData({ topicId: '', startTime: '09:00', endTime: '10:00', notes: '' });
  };

  const toggleComplete = async (task) => {
    await updateDailyTask(task.id, { completed: !task.completed });
  };

  const handleGenerateDaily = async (regenerate = false) => {
    setAiLoading(true);
    setAiError('');
    try {
      const result = await generatePlan('daily', topics, {
        date: todayStr,
        currentPlans: todayTasks,
      });
      setAiDrafts(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setAiError(error.message || 'Failed to generate daily plan.');
    } finally {
      setAiLoading(false);
    }
  };

  const updateDraftField = (index, field, value) => {
    setAiDrafts((prev) => prev.map((draft, i) => i === index ? { ...draft, [field]: value } : draft));
  };

  const handleApplyDailyDrafts = async () => {
    if (!aiDrafts.length) return;
    try {
      for (const item of aiDrafts) {
        const topicId = topics.some((t) => t.id === item.topicId) ? item.topicId : topics[0]?.id;
        if (!topicId) continue;
        await addDailyTask({
          topicId,
          date: todayStr,
          startTime: /^\d{2}:\d{2}$/.test(item.startTime || '') ? item.startTime : '09:00',
          endTime: /^\d{2}:\d{2}$/.test(item.endTime || '') ? item.endTime : '10:00',
          notes: item.notes || item.title || 'AI generated task',
        });
      }
      toast.success('AI daily plan applied');
      setAiDrafts([]);
    } catch {
      toast.error('Failed to apply AI daily plan');
    }
  };

  return (
    <div className="card p-6 min-h-[500px]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-bold text-xl text-[#1F2937] dark:text-white">Today's Schedule</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => handleGenerateDaily(false)} className="btn-secondary px-3 py-1.5 text-xs" disabled={aiLoading}>
            {aiLoading ? 'Generating...' : 'Generate Plan'}
          </button>
          <button onClick={() => handleGenerateDaily(true)} className="btn-ghost px-3 py-1.5 text-xs" disabled={aiLoading}>Regenerate</button>
          <button onClick={() => setShowForm(!showForm)} className={`btn-primary px-3 py-1.5 text-xs ${showForm ? 'bg-red-500 hover:bg-red-600' : ''}`}>
            {showForm ? 'Cancel' : <><RiAddFill /> Add Task</>}
          </button>
        </div>
      </div>

      {aiError && <p className="text-xs text-red-400 mb-3">{aiError}</p>}

      {aiDrafts.length > 0 && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/40 dark:bg-surface-800/40 p-4">
          <p className="text-sm font-bold text-[#1F2937] dark:text-white mb-3">AI Draft Plan</p>
          <div className="space-y-2">
            {aiDrafts.map((draft, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  className="input text-xs"
                  value={draft.topicId || ''}
                  onChange={(e) => updateDraftField(idx, 'topicId', e.target.value)}
                >
                  <option value="">Select topic</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
                <input className="input text-xs" value={draft.startTime || '09:00'} onChange={(e) => updateDraftField(idx, 'startTime', e.target.value)} />
                <input className="input text-xs" value={draft.endTime || '10:00'} onChange={(e) => updateDraftField(idx, 'endTime', e.target.value)} />
                <input className="input text-xs" value={draft.notes || draft.title || ''} onChange={(e) => updateDraftField(idx, 'notes', e.target.value)} />
              </div>
            ))}
          </div>
          <button className="btn-primary text-xs mt-3" onClick={handleApplyDailyDrafts}>Apply Plan</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(255,255,255,0.02)] p-5 rounded-2xl border border-[rgba(255,255,255,0.8)] dark:border-white/10 shadow-sm animate-fade-in">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#C9D1D9] mb-1">Topic</label>
              <select 
                required
                className="input w-full bg-white/70 dark:bg-surface-800"
                value={formData.topicId}
                onChange={e => setFormData({ ...formData, topicId: e.target.value })}
              >
                <option value="">Select a topic...</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#C9D1D9] mb-1">Start</label>
                <input required type="time" className="input w-full bg-white/70 dark:bg-surface-800" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#C9D1D9] mb-1">End</label>
                <input required type="time" className="input w-full bg-white/70 dark:bg-surface-800" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#C9D1D9] mb-1">Notes (Optional)</label>
              <input type="text" className="input w-full bg-white/70 dark:bg-surface-800" placeholder="What exactly are you studying?" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center">Save Task</button>
        </form>
      )}

      {sortedTasks.length === 0 ? (
        <div className="text-center py-20 opacity-80 border border-dashed border-[rgba(255,255,255,0.6)] dark:border-white/10 rounded-2xl">
          <p className="text-4xl mb-4">☕</p>
          <p className="text-[#4B5563] dark:text-[#C9D1D9] font-medium">Your day is entirely clear.</p>
          <p className="text-xs text-[#9CA3AF] dark:text-[#C9D1D9] mt-1">Add a task to start planning.</p>
        </div>
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-[2px] before:bg-gradient-to-b before:from-transparent before:via-[rgba(255,255,255,0.8)] dark:before:via-white/10 before:to-transparent">
          {sortedTasks.map((task) => {
            const topic = topics.find(t => t.id === task.topicId);
            return (
              <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-fade-in pl-8 md:pl-0">
                {/* Timeline dot */}
                <div className={`absolute left-0 md:relative md:left-auto flex items-center justify-center w-6 h-6 rounded-full border border-white dark:border-surface-800 ${task.completed ? 'bg-green-500' : 'bg-brand-500'} shadow-sm text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors`}>
                  {task.completed && <RiCheckFill size={14} />}
                </div>
                
                {/* Task Card */}
                <div className={`w-full md:w-[calc(50%-2rem)] p-4 rounded-xl border transition-all duration-300 ${
                  task.completed 
                    ? 'bg-[rgba(255,255,255,0.4)] dark:bg-black/20 border-[rgba(255,255,255,0.4)] dark:border-transparent opacity-60' 
                    : 'bg-[rgba(255,255,255,0.8)] dark:bg-surface-800/60 border-[rgba(255,255,255,0.8)] dark:border-white/10 shadow-[0_4px_24px_rgba(31,38,135,0.06)]'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold tracking-widest text-[#9CA3AF] dark:text-[#C9D1D9] uppercase flex items-center gap-1.5">
                      {task.startTime} — {task.endTime}
                    </span>
                    <button onClick={() => deleteDailyTask(task.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><RiCloseFill /></button>
                  </div>
                  <h3 className={`font-bold text-sm ${task.completed ? 'line-through text-[#9CA3AF]' : 'text-[#1F2937] dark:text-white'}`}>
                    {topic ? topic.title : 'Deleted Topic'}
                  </h3>
                  {task.notes && <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9] mt-1 line-clamp-2">{task.notes}</p>}
                  
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => toggleComplete(task)} className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${task.completed ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-[#F6F8FC] dark:bg-surface-700 text-[#4B5563] dark:text-[#C9D1D9] hover:bg-white dark:hover:bg-surface-600'}`}>
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${task.completed ? 'border-green-500 bg-green-500 text-white' : 'border-[#9CA3AF] dark:border-surface-500'}`}>
                        {task.completed && <RiCheckFill size={10} />}
                      </div>
                      {task.completed ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyPlanner;
