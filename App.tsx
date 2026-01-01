import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, Wand2, Info, X, UploadCloud, Plus, Clipboard, Eye } from 'lucide-react';
import TabSelector from './components/TabSelector.tsx';
import JsonDisplay from './components/JsonDisplay.tsx';
import ConfigurationPanel from './components/ConfigurationPanel.tsx';
import { generateJsonPrompt } from './services/geminiService.ts';
import { PromptMode, GeneratedContent, PromptSettings } from './types.ts';

interface ImageUpload {
  id: string;
  data: string; // Base64 data (no prefix)
  url: string; // Data URL for display
  mimeType: string;
}

function App() {
  const [mode, setMode] = useState<PromptMode>(PromptMode.SCENE);
  const [inputText, setInputText] = useState('');
  const [charName, setCharName] = useState('');
  const [charDesc, setCharDesc] = useState('');
  const [startingScene, setStartingScene] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PromptSettings>({
    duration: '15s',
    language: 'Indonesia',
    complexity: 'Detail',
    musicTheme: 'Cinematic',
    visualStyle: 'Default',
    aspectRatio: '16:9'
  });

  const handleSettingsChange = (newSettings: Partial<PromptSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const isFormValid = () => {
    const hasImage = selectedImages.length > 0;
    if (mode === PromptMode.SCENE) {
      return inputText.trim().length > 0 || hasImage;
    } else {
      return (charName.trim().length > 0 && startingScene.trim().length > 0) || hasImage;
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
       setError('Hanya file gambar yang didukung.');
       return;
    }

    const MAX_IMAGES = 4;
    if (selectedImages.length + validFiles.length > MAX_IMAGES) {
      setError(`Maksimal ${MAX_IMAGES} gambar referensi.`);
      return;
    }

    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultUrl = reader.result as string;
        const base64Data = resultUrl.split(',')[1];
        setSelectedImages(prev => [
          ...prev, 
          {
            id: Math.random().toString(36).substr(2, 9),
            url: resultUrl,
            data: base64Data,
            mimeType: file.type
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    
    setError(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedImages.length >= 4) return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length > 0) {
          e.preventDefault();
          processFiles(imageFiles);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedImages]);

  const handleGenerate = async () => {
    if (!isFormValid()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    let finalPrompt = inputText;
    const imageCount = selectedImages.length;
    
    if (imageCount > 0) {
      if (mode === PromptMode.CHARACTER) {
        const userCtx = charName || charDesc || startingScene 
          ? `Context (Name: ${charName}, Desc: ${charDesc}, Scene: ${startingScene})`
          : "STRICT REVERSE ENGINEER";
        finalPrompt = `[VISUAL ANALYSIS] ${userCtx}. Match image pixels exactly.`;
      } else {
        finalPrompt = `[VISUAL ANALYSIS] ${inputText || "Replicate image"}. Movement based on scene geometry.`;
      }
    } else if (mode === PromptMode.CHARACTER) {
      finalPrompt = `Name: ${charName}, Desc: ${charDesc}, Scene: ${startingScene}`;
    }

    const imageParts = selectedImages.map(img => ({
      data: img.data,
      mimeType: img.mimeType
    }));

    try {
      const data = await generateJsonPrompt(finalPrompt, mode, settings, imageParts);
      setResult(data);
    } catch (err) {
      setError("Gagal generate JSON. Pastikan API Key valid dan koneksi stabil.");
    } finally {
      setLoading(false);
    }
  };

  const isImageOnly = selectedImages.length > 0 && (mode === PromptMode.SCENE ? !inputText : (!charName && !startingScene));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-brand-500/30 font-sans">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-16 flex flex-col gap-12">
        <header className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md text-xs font-medium text-brand-300">
            <Zap size={14} className="fill-brand-300" />
            <span>AI Powered Architect</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Veo 3 JSON<br />Architect
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            Premium prompt generator untuk hasil video Veo 3 yang presisi dan sinematik.
          </p>
        </header>

        <main className="grid lg:grid-cols-12 gap-8 items-start">
          <section className="lg:col-span-7 space-y-6">
            <TabSelector currentMode={mode} onModeChange={setMode} />
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
              {mode === PromptMode.SCENE ? (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Deskripsikan adegan video Anda..."
                  className="w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-brand-500/50 resize-none outline-none transition-all"
                />
              ) : (
                <div className="space-y-4">
                  <input value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Nama Karakter..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 outline-none" />
                  <textarea value={charDesc} onChange={(e) => setCharDesc(e.target.value)} placeholder="Deskripsi Karakter..." className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none" />
                  <textarea value={startingScene} onChange={(e) => setStartingScene(e.target.value)} placeholder="Adegan Awal..." className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 outline-none" />
                </div>
              )}

              <div 
                className={`p-4 rounded-2xl border-2 border-dashed transition-all ${isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div className="flex flex-wrap gap-3">
                  {selectedImages.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700">
                      <img src={img.url} className="w-full h-full object-cover" />
                      <button onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))} className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full text-white"><X size={12}/></button>
                    </div>
                  ))}
                  {selectedImages.length < 4 && (
                    <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-400 hover:border-brand-500/50 transition-all">
                      <Plus size={24} />
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
                    </button>
                  )}
                </div>
              </div>

              <ConfigurationPanel settings={settings} onSettingsChange={handleSettingsChange} />

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-500 flex items-center gap-2"><Info size={14}/> {isImageOnly ? 'Deep Image Analysis Mode' : 'Ready to architect'}</span>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !isFormValid()}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${loading || !isFormValid() ? 'bg-slate-800 opacity-50' : 'bg-brand-600 hover:bg-brand-500 hover:-translate-y-0.5 shadow-brand-500/20'}`}
                >
                  {loading ? <span className="animate-pulse">Processing...</span> : <><Wand2 size={20}/> Generate</>}
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5">
            <div className="sticky top-8 space-y-4">
              {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}
              <JsonDisplay data={result} loading={loading} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;