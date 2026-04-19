import { useNavigate } from 'react-router-dom';
import { RiPlayFill, RiArrowRightSLine, RiLineChartLine } from 'react-icons/ri';

const SuggestionCard = ({ suggestion }) => {
  const navigate = useNavigate();
  const { type, topicId, topicTitle, priority, reason } = suggestion;

  const styleMap = {
    high:   { bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/30', text: 'text-rose-600 dark:text-rose-400',   btn: 'bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-800/60 text-rose-700 dark:text-rose-300', icon: <RiPlayFill /> },
    medium: { bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30', text: 'text-blue-600 dark:text-blue-400',   btn: 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300', icon: <RiLineChartLine /> },
    low:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30', text: 'text-emerald-600 dark:text-emerald-400', btn: 'bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-emerald-700 dark:text-emerald-300', icon: <RiArrowRightSLine /> }
  };

  const style = styleMap[priority] || styleMap.low;

  return (
    <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between h-full ${style.bg} transition-colors duration-300`}>
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] uppercase font-bold tracking-widest ${style.text}`}>
            {type === 'weak' ? 'Revise' : type === 'practice' ? 'Practice' : 'Explore'}
          </span>
        </div>
        <h3 className={`font-bold text-lg mb-1 leading-tight text-surface-900 dark:text-white line-clamp-2`}>
          {topicTitle}
        </h3>
        <p className="text-xs text-surface-600 dark:text-[#C9D1D9] font-medium mb-4 line-clamp-2">{reason}</p>
      </div>
      
      <button 
        onClick={() => navigate(`/topic/${topicId}`)}
        className={`w-full py-2 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-1.5 ${style.btn}`}
      >
        {style.icon}
        Let's go
      </button>
    </div>
  );
};

export default SuggestionCard;
