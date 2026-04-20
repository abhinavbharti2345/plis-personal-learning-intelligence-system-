// DashboardPage.jsx — Redesigned layout with Premium Glassmorphism
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTopics } from '../context/TopicContext';
import { usePlanner } from '../context/PlannerContext';
import { runClarityEngine, computeStats, getAccuracy } from '../utils/clarityEngine';
import { formatMinutes } from '../utils/dateUtils';
import { generateStudyPlan } from '@/services/aiService';
import StatCard from '../components/ui/StatCard';
import SuggestionCard from '../components/ui/SuggestionCard';
import AppLayout from '../components/layout/AppLayout';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import { RiFileList3Line } from 'react-icons/ri';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 dark:bg-surface-800/90 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-xl px-4 py-3 text-sm shadow-glass dark:shadow-md">
      <p className="text-surface-600 dark:text-[#C9D1D9] font-bold mb-1">{label}</p>
      <p className="text-brand-600 dark:text-brand-400 font-extrabold">{payload[0].value} min</p>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { topics, loading } = useTopics();
  const { todayTasks } = usePlanner();
  const navigate = useNavigate();

  const [aiPlan, setAiPlan] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const stats       = useMemo(() => computeStats(topics), [topics]);
  const suggestions = useMemo(() => runClarityEngine(topics), [topics]);

  const overdueOrToday = useMemo(() => {
    return todayTasks.filter(t => !t.completed).map(task => {
      const topic = topics.find(tp => tp.id === task.topicId);
      return {
        topicId: task.topicId,
        topicTitle: topic ? topic.title : 'Task',
        type: 'practice',
        priority: 'high',
        reason: task.notes || `Scheduled today: ${task.startTime} - ${task.endTime}`,
      };
    });
  }, [todayTasks, topics]);

  const finalSuggestions = [...overdueOrToday, ...suggestions]
       .filter((v, i, a) => a.findIndex(t => t.topicId === v.topicId) === i)
       .slice(0, 3);

  // Chart data — top 8 topics by time spent
  const chartData = useMemo(() =>
    [...topics]
      .filter((t) => t.timeSpent > 0)
      .sort((a, b) => b.timeSpent - a.timeSpent)
      .slice(0, 7)
      .map((t) => ({
        name: t.title.length > 10 ? t.title.slice(0, 10) + '…' : t.title,
        minutes: t.timeSpent,
      })),
    [topics]
  );

  // Weak topics
  const weakTopics = useMemo(() =>
    [...topics].filter(t => t.status === 'weak' || getAccuracy(t) < 60).slice(0, 4),
    [topics]
  );

  // Continue learning topics (Learning / Active)
  const continueTopics = useMemo(() =>
    [...topics].filter(t => t.status === 'learning').sort((a,b) => b.timeSpent - a.timeSpent).slice(0, 3),
    [topics]
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin shadow-glow-brand" />
        </div>
      </AppLayout>
    );
  }

  const progressPct = stats.total > 0
    ? Math.round((stats.strong / stats.total) * 100) : 0;

  const isNewUser = topics.length === 0;

  const handleGeneratePlan = async (regenerate = false) => {
    setAiLoading(true);
    setAiError('');
    try {
      const context = {
        userId: user?.uid || 'anonymous',
        date: new Date().toISOString().split('T')[0],
        currentPlans: todayTasks,
        regenerateSeed: regenerate ? Date.now() : null,
      };
      const result = await generateStudyPlan(topics, context);
      setAiPlan(result);
    } catch (error) {
      setAiError(error.message || 'Failed to generate AI study coach plan.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppLayout>
      {/* HERO ONBOARDING CARD - only for new users */}
      {isNewUser && (
        <div className="mb-10 p-8 rounded-2xl border border-white/40 dark:border-white/10 bg-gradient-to-br from-brand-50 via-purple-50 to-white/30 dark:from-brand-900/20 dark:via-purple-900/20 dark:to-white/5 shadow-glass dark:shadow-md backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🚀</span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#1F2937] dark:text-white">Welcome to your learning journey</h1>
              </div>
              <p className="text-[#4B5563] dark:text-[#C9D1D9] text-base font-medium mb-2">Your personalized learning dashboard is ready. Create your first topic to start tracking progress, build insights, and master your skills.</p>
              <p className="text-sm text-[#9CA3AF] dark:text-[#8B949E]">💡 <span className="font-semibold">Pro tip:</span> Log study sessions to unlock analytics and get personalized recommendations.</p>
            </div>
            <button 
              onClick={() => navigate('/tree')}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-bold rounded-xl shadow-glow-brand hover:shadow-lg transition-all whitespace-nowrap flex-shrink-0"
            >
              Create First Topic
            </button>
          </div>
        </div>
      )}
      {/* 1. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <StatCard label="Overall Progress" value={`${progressPct}%`} icon="🚀" color="purple" sub={`${stats.strong} mastered`} />
        <StatCard label="Study Time"       value={formatMinutes(stats.totalTime)} icon="⏱" color="brand" sub="All time" />
        <StatCard label="Accuracy Rate"    value={stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : 'N/A'} icon="🎯" color="green" />
        <StatCard label="Topics Mastered"  value={stats.strong} icon="🧠" color="orange" sub={`out of ${stats.total}`} />
      </div>

      {/* 2. WHAT TO DO NEXT */}
      <h2 className="section-title mb-4">What to do next</h2>

      <div className="card p-5 mb-6 border border-white/50 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#1F2937] dark:text-white">✨ AI Study Coach</p>
            <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9] mt-1">Generate a focused plan for today using your topics and planner context.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGeneratePlan(false)}
              className="btn-secondary text-xs"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Generating...
                </span>
              ) : 'Generate Plan'}
            </button>
            <button
              onClick={() => handleGeneratePlan(true)}
              className="btn-ghost text-xs"
              disabled={aiLoading}
            >
              Regenerate
            </button>
          </div>
        </div>

        {aiError && <p className="text-xs text-red-400 mt-3">{aiError}</p>}

        {aiPlan && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[#4B5563] dark:text-[#C9D1D9] mb-2">Generated Plan</p>
            <pre className="whitespace-pre-wrap text-sm leading-6 rounded-xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-surface-800/40 p-3 text-[#1F2937] dark:text-white font-sans">
              {aiPlan}
            </pre>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-10">
        {finalSuggestions.length === 0 ? (
          isNewUser ? (
            <div className="col-span-1 md:col-span-3 card p-8 text-center border border-dashed border-brand-200 dark:border-brand-900/40 bg-brand-50/40 dark:bg-brand-900/10 hover:shadow-glass transition-shadow">
              <p className="text-4xl mb-3">✨</p>
              <p className="text-[#1F2937] dark:text-white font-bold text-lg">Ready to begin your learning journey?</p>
              <p className="text-[#4B5563] dark:text-[#C9D1D9] opacity-90 text-sm mt-2 mb-4">Create your first topic in the Skill Tree to see personalized learning recommendations.</p>
              <button 
                onClick={() => navigate('/tree')}
                className="inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-lg transition-colors"
              >
                Create Topic
              </button>
            </div>
          ) : (
            <div className="col-span-1 md:col-span-3 card p-8 text-center border-dashed border-[#9CA3AF] dark:border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(255,255,255,0.02)]">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-[#1F2937] dark:text-white font-bold">All caught up!</p>
              <p className="text-[#4B5563] dark:text-[#C9D1D9] opacity-90 text-sm mt-1">Keep studying and logging sessions to see recommendations.</p>
            </div>
          )
        ) : (
          finalSuggestions.map((s, i) => (
             <SuggestionCard key={i} suggestion={s} />
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10">
        {/* 3. STUDY TIME ANALYTICS */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="section-title">Study Time Analytics</h2>
              <p className="text-sm text-surface-500 dark:text-[#C9D1D9] font-medium">Time spent per topic</p>
            </div>
          </div>
          
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center border border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
              <div className="text-center">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-surface-600 dark:text-[#C9D1D9] text-sm font-medium">Log study sessions to see your analytics</p>
                <p className="text-xs text-surface-400 dark:text-[#8B949E] mt-1">Track time spent per topic and visualize your progress</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} dx={-10} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(91,140,255,0.04)' }} />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill="#5B8CFF" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 4. WEAK TOPICS PANEL */}
        <div className="card p-6 flex flex-col">
          <h2 className="section-title mb-1">Needs Attention</h2>
          <p className="text-sm text-surface-500 dark:text-[#C9D1D9] font-medium mb-4">Weak topics to revise</p>
          
          {weakTopics.length === 0 ? (
             <div className="flex-1 flex items-center justify-center border border-dashed border-surface-200 dark:border-surface-700 rounded-xl">
               <div className="text-center px-4">
                 <p className="text-2xl mb-2">✨</p>
                 <p className="text-surface-600 dark:text-[#C9D1D9] text-sm font-medium">No weak topics yet</p>
                 <p className="text-xs text-surface-400 dark:text-[#8B949E] mt-1">Keep practicing to maintain your strong performance!</p>
               </div>
             </div>
          ) : (
            <div className="space-y-3 flex-1">
              {weakTopics.map(t => (
                <div key={t.id} onClick={() => navigate(`/topic/${t.id}`)} className="p-3 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors cursor-pointer flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs"><RiFileList3Line /></span>
                    <p className="text-sm font-bold text-surface-800 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{t.title}</p>
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-md">{getAccuracy(t) ?? 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. CONTINUE LEARNING */}
      <h2 className="section-title mb-4">Continue Learning</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {continueTopics.length === 0 ? (
          isNewUser ? (
            <div className="col-span-1 md:col-span-3 card p-8 border border-dashed border-purple-200 dark:border-purple-900/40 shadow-none text-center bg-purple-50/40 dark:bg-purple-900/10">
              <p className="text-3xl mb-3">📚</p>
              <p className="text-[#1F2937] dark:text-white font-bold text-lg">Start your first topic</p>
              <p className="text-[#4B5563] dark:text-[#C9D1D9] text-sm font-medium mt-2 mb-4">Create a topic and mark it as "Learning" to track your progress here</p>
              <button 
                onClick={() => navigate('/tree')}
                className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-lg transition-colors"
              >
                Explore Topics
              </button>
            </div>
          ) : (
            <div className="col-span-1 md:col-span-3 card p-6 border border-dashed border-surface-300 dark:border-surface-700 shadow-none text-center">
              <p className="text-surface-500 dark:text-[#C9D1D9] text-sm font-medium">Mark a topic as 'Learning' to see it here.</p>
            </div>
          )
        ) : (
          continueTopics.map(t => {
            const acc = getAccuracy(t) || 0;
            return (
              <div key={t.id} onClick={() => navigate(`/topic/${t.id}`)} className="card p-5 cursor-pointer hover:shadow-glass-hover">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 flex flex-shrink-0 items-center justify-center font-bold">📚</span>
                  <p className="text-sm font-bold text-surface-800 dark:text-white line-clamp-1">{t.title}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-surface-500 dark:text-[#C9D1D9] mb-1.5">
                    <span>Accuracy</span>
                    <span className="text-brand-600 dark:text-brand-400">{acc}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${acc}%` }} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

    </AppLayout>
  );
};

export default DashboardPage;
