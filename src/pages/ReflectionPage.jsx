// ReflectionPage.jsx — Daily reflection input + history + insights
import { useState, useMemo } from 'react';
import { useReflections } from '../context/ReflectionContext';
import { useTopics } from '../context/TopicContext';
import { usePlanner } from '../context/PlannerContext';
import { generateInsights, sentimentEmoji } from '../utils/keywordDetector';
import AppLayout from '../components/layout/AppLayout';
import { analyzeReflection } from '@/services/aiService';
import { RiQuillPenLine, RiSendPlane2Line, RiLightbulbLine } from 'react-icons/ri';
import toast from 'react-hot-toast';

const ReflectionPage = () => {
  const { reflections, loading, addReflection } = useReflections();
  const { topics } = useTopics();
  const { addDailyTask, todayStr } = usePlanner();
  const [text, setText]     = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiInsights, setAiInsights] = useState([]);

  const insights = useMemo(() => generateInsights(reflections), [reflections]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) { toast.error('Write something first'); return; }
    setSaving(true);
    try {
      await addReflection(text.trim());
      setText('');
      toast.success('Reflection saved 📓');
    } catch {
      toast.error('Failed to save reflection');
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const toInsightList = (resultText) => {
    if (!resultText || typeof resultText !== 'string') return [];

    return resultText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean);
  };

  const handleAnalyze = async () => {
    const latestReflection = text.trim() || reflections[0]?.content || '';
    if (!latestReflection) {
      toast.error('Write or save a reflection first');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const result = await analyzeReflection(latestReflection);
      setAiInsights(toInsightList(result));
    } catch (error) {
      setAiError(error.message || 'Failed to analyze reflection');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestion = async (insight) => {
    const topicId = topics[0]?.id;
    if (!topicId) {
      toast.error('Create at least one topic before applying suggestion');
      return;
    }

    try {
      await addDailyTask({
        topicId,
        date: todayStr,
        startTime: '20:00',
        endTime: '21:00',
        notes: insight,
      });
      toast.success('Suggestion added to planner');
    } catch {
      toast.error('Failed to add suggestion to planner');
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-100 flex items-center gap-3">
          <RiQuillPenLine className="text-accent-purple" />
          Reflection
        </h1>
        <p className="text-gray-400 text-sm mt-1">{today}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input + history */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's input */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-100 mb-1">✍️ How was your study session today?</h2>
            <p className="text-xs text-gray-500 mb-4">
              Be honest — describe what you studied, what distracted you, breakthroughs, struggles.
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className="btn-secondary text-xs"
                onClick={handleAnalyze}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Analyzing...
                  </span>
                ) : '✨ Analyze Reflection'}
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={handleAnalyze}
                disabled={aiLoading}
              >
                Regenerate
              </button>
            </div>
            {aiError && <p className="text-xs text-red-400 mb-3">{aiError}</p>}
            <form onSubmit={handleSubmit}>
              <textarea
                id="reflection-input"
                className="textarea w-full h-36 text-sm leading-relaxed"
                placeholder={`e.g. "Studied dynamic programming for 2 hours. Felt focused initially but got distracted by Instagram. Finally understood memoization after watching a visualization."`}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-600">{text.length} characters</p>
                <button
                  type="submit"
                  id="reflection-submit"
                  className="btn-primary text-sm"
                  disabled={saving}
                >
                  <RiSendPlane2Line size={15} />
                  {saving ? 'Saving...' : 'Save Reflection'}
                </button>
              </div>
            </form>
          </div>

          {/* Reflection history */}
          <div className="space-y-3">
            <h2 className="font-bold text-gray-100">📖 Past Reflections</h2>
            {loading ? (
              <div className="card p-8 text-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : reflections.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-3xl mb-3">📓</p>
                <p className="text-gray-400">No reflections yet. Write your first one above!</p>
              </div>
            ) : (
              reflections.map((r) => (
                <div key={r.id} className="card p-5 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-300">{r.date}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sentimentEmoji(r.sentiment)}</span>
                      <span className="text-xs text-gray-500 capitalize">{r.sentiment}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                  {r.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-white/5">
                      {r.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className={kw.type === 'negative' ? 'badge-red' : 'badge-green'}
                        >
                          {kw.word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Insights panel */}
        <div className="space-y-4">
          <h2 className="font-bold text-gray-100 flex items-center gap-2">
            <RiLightbulbLine className="text-accent-amber" /> Insights
          </h2>
          {insights.map((ins, i) => (
            <div key={i} className={`card p-4 flex items-start gap-3 border-l-4 ${
              ins.type === 'warning' ? 'border-l-accent-amber bg-accent-amber/5' :
              ins.type === 'success' ? 'border-l-accent-green bg-accent-green/5' :
              'border-l-brand-500 bg-brand-500/5'
            }`}>
              <span className="text-xl flex-shrink-0">{ins.icon}</span>
              <p className="text-sm text-gray-300">{ins.text}</p>
            </div>
          ))}

          {aiInsights.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-white mt-5">AI Reflection Insights</h3>
              {aiInsights.map((ins, i) => (
                <div key={`ai-${i}`} className="card p-4 border-l-4 border-l-brand-500 bg-brand-500/5">
                  <p className="text-sm text-gray-200">• {ins}</p>
                  <button
                    className="btn-secondary text-xs mt-3"
                    onClick={() => handleApplySuggestion(ins)}
                  >
                    Apply Suggestion to Planner
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Sentiment this week */}
          {reflections.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                This Week's Mood
              </p>
              <div className="space-y-2">
                {['positive', 'neutral', 'negative'].map((s) => {
                  const count = reflections.slice(0, 7).filter((r) => r.sentiment === s).length;
                  const pct   = reflections.slice(0, 7).length > 0
                    ? Math.round((count / Math.min(reflections.length, 7)) * 100) : 0;
                  const color = s === 'positive' ? 'bg-accent-green' : s === 'negative' ? 'bg-accent-red' : 'bg-accent-amber';
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400 capitalize">{s}</span>
                        <span className="text-gray-500">{count} days</span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`}
                             style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ReflectionPage;
