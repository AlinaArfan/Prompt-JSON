import React, { useState } from 'react';
import { Check, Copy, FileJson, Terminal, LayoutList, Code, Image as ImageIcon, Film, User, Layers, Sparkles, Palette, Camera, Box } from 'lucide-react';
import { GeneratedContent, GeneratedSceneJson, GeneratedCharacterJson } from '../types';

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
      <div className="w-full h-96 rounded-2xl border border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/10 via-transparent to-purple-500/10 opacity-50" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <div className="text-brand-200 font-mono text-sm animate-pulse">Analyzing Visual Fidelity...</div>
          <div className="flex gap-1">
             <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce delay-75"></div>
             <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce delay-100"></div>
             <div className="w-1 h-1 bg-brand-400 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-64 rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Terminal size={32} className="opacity-50" />
        <p className="text-sm">JSON Output will appear here</p>
      </div>
    );
  }

  const isScene = 'timeline' in data;
  const sig = data.visual_signature;

  const renderVisualView = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* 1. Main Optimized Prompt */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
        <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
             <div className="flex items-center gap-2 text-brand-400">
                <Sparkles size={18} />
                <span className="font-semibold tracking-wide">VEO 3 OPTIMIZED PROMPT</span>
             </div>
             <button 
                onClick={() => handleCopy(data.veo_optimized_prompt, 'main')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors text-xs font-medium"
             >
                {copiedId === 'main' ? <Check size={14} /> : <Copy size={14} />}
                {copiedId === 'main' ? 'Copied' : 'Copy Full'}
             </button>
          </div>
          <div className="p-6 text-slate-300 leading-relaxed text-lg font-light selection:bg-brand-500/30">
            {data.veo_optimized_prompt}
          </div>
        </div>
      </div>

      {/* 2. Visual Signature (Captured from Image) */}
      {sig && (
        <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ImageIcon size={16} className="text-brand-400" />
              Visual Analysis (Reference Anchor)
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SigItem icon={Palette} title="Detected Palette" content={sig.detected_palette.join(', ')} />
              <SigItem icon={Box} title="Key Textures" content={sig.key_textures.join(', ')} />
              <SigItem icon={Camera} title="Camera Specs" content={sig.camera_specs} />
              <SigItem icon={Sparkles} title="Atmosphere" content={sig.environmental_mood} />
           </div>
        </div>
      )}

      {/* 3. Structural Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
           <Layers size={20} className="text-purple-400" />
           <span>Prompt Components</span>
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
           <ComponentCard title="Subject & Action" content={data.prompt_components.subject_action} id="comp-1" onCopy={handleCopy} copiedId={copiedId} />
           <ComponentCard title="Environment" content={data.prompt_components.environment_context} id="comp-2" onCopy={handleCopy} copiedId={copiedId} />
           <ComponentCard title="Lighting" content={data.prompt_components.lighting_atmosphere} id="comp-3" onCopy={handleCopy} copiedId={copiedId} />
           <ComponentCard title="Texture Specs" content={data.prompt_components.texture_details} id="comp-4" onCopy={handleCopy} copiedId={copiedId} />
        </div>
      </div>

      {/* 4. Timeline / Sequences */}
      {(isScene || (data as GeneratedCharacterJson).dialogue_sequence) && (
        <div className="space-y-6 pt-4">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Film size={22} className="text-brand-400" />
                 {isScene ? 'Sequence Timeline' : 'Performance Sequence'}
              </h3>
           </div>
           
           <div className="grid gap-6">
              {isScene 
                ? (data as GeneratedSceneJson).timeline.map((item, idx) => (
                    <PartCard 
                      key={idx}
                      index={idx + 1}
                      content={item.description}
                      subTitle="VISUAL FOCUS"
                      subContent={item.objects_in_focus.join(', ')}
                      id={`part-${idx}`}
                      onCopy={handleCopy}
                      copiedId={copiedId}
                    />
                  ))
                : (data as GeneratedCharacterJson).dialogue_sequence?.map((item, idx) => (
                    <PartCard 
                      key={idx}
                      index={idx + 1}
                      content={`"${item.line}"`}
                      subTitle="EMOTION"
                      subContent={`${item.speaker} - ${item.emotion}`}
                      id={`part-${idx}`}
                      onCopy={handleCopy}
                      copiedId={copiedId}
                    />
                  ))
              }
           </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex gap-1">
          <button onClick={() => setViewMode('visual')} className={`px-4 py-2 rounded-md text-sm transition-all ${viewMode === 'visual' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><LayoutList size={16} className="inline mr-2" />Visual Board</button>
          <button onClick={() => setViewMode('json')} className={`px-4 py-2 rounded-md text-sm transition-all ${viewMode === 'json' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}><Code size={16} className="inline mr-2" />JSON Code</button>
        </div>
      </div>
      {viewMode === 'visual' ? renderVisualView() : (
         <div className="rounded-2xl border border-slate-700 bg-[#0d1117] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
              <span className="text-sm font-mono text-slate-400">prompt_export.json</span>
              <button onClick={() => handleCopy(JSON.stringify(data, null, 2), 'json-raw')} className="text-xs bg-slate-800 px-3 py-1 rounded text-slate-300">Copy JSON</button>
            </div>
            <pre className="p-6 text-xs font-mono text-brand-300 overflow-auto max-h-[600px]">{JSON.stringify(data, null, 2)}</pre>
         </div>
      )}
    </div>
  );
};

const SigItem = ({ icon: Icon, title, content }: any) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
      <Icon size={12} />
      {title}
    </div>
    <div className="text-xs text-slate-200 line-clamp-2 leading-snug">{content}</div>
  </div>
);

const ComponentCard = ({ title, content, id, onCopy, copiedId }: any) => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors">
    <div className="flex justify-between items-start mb-2">
       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
       <button onClick={() => onCopy(content, id)} className="text-slate-500 hover:text-white transition-colors">
          {copiedId === id ? <Check size={14} /> : <Copy size={14} />}
       </button>
    </div>
    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">{content}</p>
  </div>
);

const PartCard = ({ index, content, subTitle, subContent, id, onCopy, copiedId }: any) => (
  <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
          <h4 className="text-blue-600 font-bold">Part {index}</h4>
          <button onClick={() => onCopy(content, id)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
             {copiedId === id ? <Check size={16} /> : <Copy size={16} />}
          </button>
      </div>
      <div className="p-6">
          <p className="text-slate-800 font-medium">{content}</p>
      </div>
      {subContent && (
          <div className="px-6 pb-6">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0">{subTitle}</div>
                  <div className="text-slate-600 text-sm font-medium truncate flex-1">{subContent}</div>
              </div>
          </div>
      )}
  </div>
);

export default JsonDisplay;