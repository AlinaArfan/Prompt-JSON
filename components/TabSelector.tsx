import React from 'react';
import { Clapperboard, User, Sparkles } from 'lucide-react';
import { PromptMode } from '../types';

interface TabSelectorProps {
  currentMode: PromptMode;
  onModeChange: (mode: PromptMode) => void;
}

const TabSelector: React.FC<TabSelectorProps> = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/50 backdrop-blur-sm inline-flex relative shadow-xl">
        {/* Animated Background slider could go here, but simple conditional classes work well for now */}
        
        <button
          onClick={() => onModeChange(PromptMode.SCENE)}
          className={`
            relative px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 font-medium text-sm md:text-base
            ${currentMode === PromptMode.SCENE 
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }
          `}
        >
          <Clapperboard size={18} />
          <span>Prompt Adegan</span>
        </button>

        <button
          onClick={() => onModeChange(PromptMode.CHARACTER)}
          className={`
            relative px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 font-medium text-sm md:text-base
            ${currentMode === PromptMode.CHARACTER 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }
          `}
        >
          <User size={18} />
          <span>Prompt Karakter</span>
        </button>
      </div>
    </div>
  );
};

export default TabSelector;