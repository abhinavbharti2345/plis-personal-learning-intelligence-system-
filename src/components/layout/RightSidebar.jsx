import { useMemo } from 'react';
import { useReflections } from '../../context/ReflectionContext';
import { useTopics } from '../../context/TopicContext';
import { usePlanner } from '../../context/PlannerContext';
import { sentimentEmoji } from '../../utils/keywordDetector';

const RightSidebar = () => {
  const { reflections } = useReflections();
  const { streak, topics } = useTopics();
  const { todayTasks } = usePlanner();

  const upcomingSessions = todayTasks
    .filter(t => !t.completed)
    .sort((a,b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3)
    .map(t => {
      const topic = topics.find(tp => tp.id === t.topicId);
      return {
        id: t.id,
        title: topic ? topic.title : 'Deleted Topic',
        time: `Today, ${t.startTime}`,
        color: 'bg-brand-500'
      };
    });



  return (
    <aside className="w-80 h-full border-l border-[rgba(255,255,255,0.8)] dark:border-white/15 bg-[rgba(255,255,255,0.85)] dark:bg-surface-800/35 backdrop-blur-xl overflow-y-auto hidden lg:block p-6 transition-colors duration-300 shadow-[inset_1px_0_0_rgba(255,255,255,0.6)]">
      
      {/* 1. Study Streak */}
      <div className="card p-5 mb-6 bg-white/80 dark:bg-transparent dark:from-surface-800/80 dark:to-surface-800/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#1F2937] dark:text-white tracking-tight">Study Streak</h3>
          <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm">
            🔥 {streak} {streak === 1 ? 'day' : 'days'}
          </span>
        </div>
        
        {/* Mini weekly calendar dots */}
        <div className="flex justify-between mt-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
            const currentDayIndex = new Date().getDay(); 
            const mapIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1; 
            const isToday = i === mapIndex;
            const isActive = streak > 0 && i <= mapIndex && (streak > mapIndex ? true : i >= (mapIndex - streak + 1));
            
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={`text-[10px] font-semibold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-[#C9D1D9]'}`}>{day}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm transition-colors
                  ${isActive 
                    ? (isToday ? 'bg-orange-400 text-white shadow-md shadow-orange-400/30' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400') 
                    : 'bg-surface-100 dark:bg-[rgba(255,255,255,0.04)] border border-white dark:border-[rgba(255,255,255,0.08)] text-surface-300 dark:text-[#C9D1D9]'
                  }`}
                >
                  {isActive && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Upcoming Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-surface-800 dark:text-white tracking-tight">Upcoming</h3>
        </div>
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
             <div className="p-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.6)] dark:border-[rgba(255,255,255,0.2)] text-center bg-white/40 dark:bg-[rgba(255,255,255,0.02)]">
               <p className="text-xs text-[#4B5563] dark:text-[#C9D1D9] opacity-90 font-medium">No upcoming tasks today.</p>
             </div>
          ) : (
            upcomingSessions.map((session, i) => (
              <div key={session.id || i} className="card p-4 hover:shadow-glass-hover hover:-translate-y-0.5 transition-transform cursor-pointer border border-[rgba(255,255,255,0.8)] dark:border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(255,255,255,0.03)] focus:outline-none">
                <div className="flex gap-3">
                  <div className={`w-1 h-full min-h-[32px] rounded-full ${session.color}`}></div>
                  <div>
                    <p className="text-sm font-bold text-[#1F2937] dark:text-white leading-tight">{session.title}</p>
                    <p className="text-xs font-medium text-[#4B5563] dark:text-[#C9D1D9] mt-1 opacity-90">{session.time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Recent Reflections */}
      <div>
        <h3 className="font-bold text-surface-800 dark:text-white tracking-tight mb-3">Recent Reflections</h3>
        {reflections.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-surface-300 dark:border-[rgba(255,255,255,0.2)] text-center bg-white/40 dark:bg-[rgba(255,255,255,0.02)]">
            <p className="text-xs text-surface-500 dark:text-[#C9D1D9] opacity-90 font-medium">No reflections yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reflections.slice(0, 3).map((r) => (
              <div key={r.id} className="card p-4 hover:shadow-glass-hover transition-shadow text-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{r.date}</span>
                  <span className="text-sm">{sentimentEmoji(r.sentiment)}</span>
                </div>
                <p className="text-surface-700 text-xs leading-relaxed line-clamp-3">
                  "{r.content}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </aside>
  );
};

export default RightSidebar;
