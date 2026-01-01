
import React, { useState } from 'react';
// Fix: Added missing Zap icon to lucide-react imports
import { Check, Copy, FileJson, Terminal, LayoutList, Code, Image as ImageIcon, Film, User, Layers, Sparkles, Palette, Camera, Box, Zap } from 'lucide-react';
import { GeneratedContent, GeneratedSceneJson, GeneratedCharacterJson } from '../types.ts';

interface JsonDisplayProps {
  data: GeneratedContent | null;
  loading: boolean;
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ data, loading }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="w-full h-96 rounded-3xl border border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/10 via-transparent to-purple-500/10 animate-pulse" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-400 animate-bounce" size={24} />
          </div>
          <div className="text-center space-y-2">
            <div className="text-brand-300 font-mono text-sm tracking-widest uppercase">Analyzing Pixels...</div>
            <div className="text-slate-500 text-xs font-light">Architecting technical sequences from your reference</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-64 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 flex flex-col items-center justify-center text-slate-500 gap-4">
        <div className="p-4 bg-slate-900 rounded-2xl">
          <Terminal size={32} className="opacity-40" />
        </div>
        <p className="text-sm font-medium tracking-wide">Output JSON akan muncul di sini</p>
      </div>
    );
  }

  const isScene = 'timeline' in data;
  const sig = data.visual_signature;

  const renderVisualView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* 1. VEO OPTIMIZED PROMPT */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-600 rounded-3xl blur opacity-25" />
        <div className="relative bg-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
             <div className="flex items-center gap-2 text-brand-400">
                <Zap size={18} className="fill-brand-400" />
                <span className="font-bold text-xs uppercase tracking-widest">Veo 3 Master Prompt</span>
             </div>
             <button 
                onClick={() => handleCopy(data.veo_optimized_prompt, 'main')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-all text-xs font-bold"
             >
                {copiedId === 'main' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'main' ? 'Copied!' : 'Copy Prompt'}
             </button>
          </div>
          <div className="p-8 text-slate-100 leading-relaxed text-lg font-medium selection:bg-brand-500/30">
            {data.veo_optimized_prompt}
          </div>
        </div>
      </div>

      {/* 2. VISUAL SIGNATURE */}
      {sig && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-6">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
                <ImageIcon size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Visual DNA Analysis</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SigItem icon={Palette} title="Color Palette" content={sig.detected_palette.join(', ')} color="text-pink-400" />
              <SigItem icon={Camera} title="Camera Optic" content={sig.camera_specs} color="text-blue-400" />
              <SigItem icon={Box} title="Texture Specs" content={sig.key_textures.join(', ')} color="text-emerald-400" />
              <SigItem icon={Sparkles} title="Atmosfer" content={sig.environmental_mood} color="text-amber-400" />
           </div>
        </div>
      )}

      {/* 3. SEQUENCE TIMELINE */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
             <Film size={20} />
           </div>
           <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">
             {isScene ? 'Sequence Architect' : 'Performance Sequence'}
           </h3>
        </div>
        
        <div className="grid gap-4">
           {isScene 
             ? (data as GeneratedSceneJson).timeline.map((item, idx) => (
                 <SequenceCard 
                   key={idx}
                   index={idx + 1}
                   time={item.timestamp}
                   content={item.description}
                   tags={item.objects_in_focus}
                   id={`part-${idx}`}
                   onCopy={handleCopy}
                   copiedId={copiedId}
                 />
               ))
             : (data as GeneratedCharacterJson).dialogue_sequence?.map((item, idx) => (
                 <SequenceCard 
                   key={idx}
                   index={idx + 1}
                   time={item.emotion}
                   content={`"${item.line}"`}
                   tags={[item.speaker]}
                   id={`part-${idx}`}
                   onCopy={handleCopy}
                   copiedId={copiedId}
                 />
               ))
           }
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-end">
        <div className="bg-slate-900 p-1 rounded-2xl border border-slate-800 flex gap-1">
          <button onClick={() => setViewMode('visual')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'visual' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>BOARD VIEW</button>
          <button onClick={() => setViewMode('json')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'json' ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>RAW JSON</button>
        </div>
      </div>
      {viewMode === 'visual' ? renderVisualView() : (
         <div className="rounded-3xl border border-slate-800 bg-[#0d1117] overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <span className="text-xs font-mono text-slate-500">veo3_architect_export.json</span>
              <button onClick={() => handleCopy(JSON.stringify(data, null, 2), 'json-raw')} className="text-[10px] font-bold bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-700">COPY RAW</button>
            </div>
            <pre className="p-8 text-xs font-mono text-brand-300 overflow-auto max-h-[600px] leading-relaxed">{JSON.stringify(data, null, 2)}</pre>
         </div>
      )}
    </div>
  );
};

const SigItem = ({ icon: Icon, title, content, color }: any) => (
  <div className="space-y-2 p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${color}`}>
      <Icon size={14} />
      {title}
    </div>
    <div className="text-xs text-slate-200 leading-relaxed font-medium">{content}</div>
  </div>
);

const SequenceCard = ({ index, time, content, tags, id, onCopy, copiedId }: any) => (
  <div className="bg-white rounded-3xl overflow-hidden shadow-xl group border border-slate-200">
      <div className="px-6 py-4 flex items-center justify-between bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/30">{index}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{time}</span>
          </div>
          <button onClick={() => onCopy(content, id)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
             {copiedId === id ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
      </div>
      <div className="p-6">
          <p className="text-slate-800 font-semibold leading-relaxed text-sm md:text-base">{content}</p>
      </div>
      {tags && tags.length > 0 && (
          <div className="px-6 pb-6 flex flex-wrap gap-2">
              {tags.map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-full uppercase tracking-tighter border border-slate-200">
                  {tag}
                </span>
              ))}
          </div>
      )}
  </div>
);

export default JsonDisplay;
