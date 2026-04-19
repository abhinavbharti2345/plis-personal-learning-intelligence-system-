import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import DailyPlanner from '../components/planner/DailyPlanner';
import WeeklyPlanner from '../components/planner/WeeklyPlanner';
import MonthlyPlanner from '../components/planner/MonthlyPlanner';

const PlannerPage = () => {
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-[rgba(255,255,255,0.8)] dark:border-white/10">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1F2937] dark:text-white tracking-tight">Structured Planner</h1>
          <p className="text-[#4B5563] dark:text-[#C9D1D9] text-sm mt-1 opacity-90 font-medium">Coordinate your topics into actionable daily, weekly, and monthly goals.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        {['daily', 'weekly', 'monthly'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 font-bold text-sm tracking-wide rounded-full capitalize transition-colors ${
              activeTab === tab
                ? 'bg-[rgba(91,140,255,0.15)] text-[#3B82F6] dark:bg-brand-500/20 dark:text-brand-300 border border-[#3B82F6] dark:border-brand-400'
                : 'text-[#4B5563] dark:text-[#C9D1D9] hover:bg-[rgba(255,255,255,0.8)] dark:hover:bg-surface-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'daily'   && <DailyPlanner />}
        {activeTab === 'weekly'  && <WeeklyPlanner />}
        {activeTab === 'monthly' && <MonthlyPlanner />}
      </div>
    </AppLayout>
  );
};

export default PlannerPage;
