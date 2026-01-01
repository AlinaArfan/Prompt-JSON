import React from 'react';
import { Clock, Globe, BarChart3, Music, Video, Zap, Ghost, Coffee, Info, Palette, RectangleHorizontal, RectangleVertical, Square, Monitor } from 'lucide-react';
import { PromptSettings, DurationOption, LanguageOption, ComplexityLevel, MusicTheme, VisualStyle, AspectRatio } from '../types';

interface ConfigurationPanelProps {
  settings: PromptSettings;
  onSettingsChange: (newSettings: Partial<PromptSettings>) => void;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ settings, onSettingsChange }) => {
  
  const update = (key: keyof PromptSettings, value: any) => {
    onSettingsChange({ [key]: value });
  };

  return (
    <div className="bg-[#0b0f19] rounded-[1.3rem] p-6 space-y-8 border border-slate-800">
      
      {/* Duration Section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
          <Clock size={14} />
          Durasi
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '15d', sub: '2 parts', val: '15s' },
            { label: '30d', sub: '4 parts', val: '30s' },
            { label: '1m', sub: '8 parts', val: '1m' },
            { label: '2m', sub: '15 parts', val: '2m' }
          ].map((item) => {
            const isActive = settings.duration === item.val;
            return (
              <button
                key={item.val}
                onClick={() => update('duration', item.val)}
                className={`
                  relative flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                  }
                `}
              >
                <span className={`text-lg font-bold ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>{item.label}</span>
                <span className="text-[10px] opacity-70">{item.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
          <Globe size={14} />
          Bahasa
        </label>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['Indonesia', 'Inggris'] as LanguageOption[]).map((lang) => (
             <button
               key={lang}
               onClick={() => update('language', lang)}
               className={`
                 flex-1 py-2 rounded-lg text-sm font-medium transition-all
                 ${settings.language === lang 
                   ? 'bg-slate-700 text-white shadow-sm' 
                   : 'text-slate-500 hover:text-slate-300'
                 }
               `}
             >
               {lang}
             </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio Section */}
      <div className="space-y-3">
         <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            <RectangleHorizontal size={14} />
            Rasio Aspek
         </label>
         <div className="grid grid-cols-3 gap-2">
            {[
               { label: '16:9', icon: RectangleHorizontal, desc: 'Landscape' },
               { label: '9:16', icon: RectangleVertical, desc: 'Portrait' },
               { label: '1:1',  icon: Square, desc: 'Square' },
               { label: '21:9', icon: Monitor, desc: 'Wide' },
               { label: '4:3',  icon: RectangleHorizontal, desc: 'Classic' },
            ].map((ratio) => {
               const isActive = settings.aspectRatio === ratio.label;
               const Icon = ratio.icon;
               return (
                  <button
                     key={ratio.label}
                     onClick={() => update('aspectRatio', ratio.label as AspectRatio)}
                     className={`
                        flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 gap-1
                        ${isActive 
                           ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300' 
                           : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'
                        }
                     `}
                  >
                     <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                     <span className="text-xs font-bold">{ratio.label}</span>
                  </button>
               )
            })}
         </div>
      </div>

      {/* Visual Style Section */}
      <div className="space-y-3">
         <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            <Palette size={14} />
            Gaya Visual
         </label>
         <div className="grid grid-cols-3 gap-2">
            {[
               { label: 'Default',    gradient: 'from-emerald-900 to-slate-900' },
               { label: 'Cinematic',  gradient: 'from-blue-900 to-slate-950' },
               { label: 'Anime',      gradient: 'from-sky-500 to-blue-600' },
               { label: 'Cyberpunk',  gradient: 'from-fuchsia-700 to-purple-900' },
               { label: 'Lego',       gradient: 'from-yellow-500 to-red-600' },
               { label: 'Claymation', gradient: 'from-orange-800 to-amber-950' }
            ].map((style) => {
               const isActive = settings.visualStyle === style.label;
               return (
                  <button
                     key={style.label}
                     onClick={() => update('visualStyle', style.label as VisualStyle)}
                     className={`
                        relative group overflow-hidden rounded-xl border aspect-[16/10] transition-all duration-300
                        ${isActive 
                           ? 'border-brand-400 ring-2 ring-brand-500/30 scale-[1.02]' 
                           : 'border-slate-800 hover:border-slate-600'
                        }
                     `}
                  >
                     {/* Background Gradient */}
                     <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
                     
                     {/* Overlay for readability */}
                     <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                     {/* Label */}
                     <div className="absolute inset-0 flex items-center justify-center p-2">
                        <span className="text-white font-bold text-xs md:text-sm text-center drop-shadow-md">
                           {style.label}
                        </span>
                     </div>
                  </button>
               )
            })}
         </div>
      </div>

      {/* Complexity Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
            <BarChart3 size={14} />
            Kompleksitas
          </label>
        </div>
        
        <div className="relative pt-2 pb-6 px-2">
          <input
            type="range"
            min="0"
            max="100"
            step="50"
            value={settings.complexity === 'Simple' ? 0 : settings.complexity === 'Detail' ? 50 : 100}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              const level = val === 0 ? 'Simple' : val === 50 ? 'Detail' : 'Complex';
              update('complexity', level);
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-500 uppercase">
             <span className={settings.complexity === 'Simple' ? 'text-brand-400' : ''}>Simpel</span>
             <span className={settings.complexity === 'Detail' ? 'text-brand-400' : ''}>Detail</span>
             <span className={settings.complexity === 'Complex' ? 'text-brand-400' : ''}>Kompleks</span>
          </div>
        </div>
      </div>

      {/* Music Theme Section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 tracking-wider uppercase">
          <Music size={14} />
          Tema Musik
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Cinematic', icon: Video },
            { label: 'Electronic', icon: Zap },
            { label: 'Horror', icon: Ghost },
            { label: 'Lo-fi', icon: Coffee },
          ].map((item) => {
            const isActive = settings.musicTheme === item.label;
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => update('musicTheme', item.label as MusicTheme)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left
                  ${isActive 
                    ? 'bg-purple-600/10 border-purple-500/50 text-purple-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                  }
                `}
              >
                <Icon size={16} className={isActive ? 'text-purple-400' : 'text-slate-600'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default ConfigurationPanel;