import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Zap, Wand2, Info, Image as ImageIcon, X, UploadCloud, Plus, Clipboard, Eye } from 'lucide-react';
import TabSelector from './components/TabSelector';
import JsonDisplay from './components/JsonDisplay';
import ConfigurationPanel from './components/ConfigurationPanel';
import { generateJsonPrompt } from './services/geminiService';
import { PromptMode, GeneratedContent, PromptSettings } from './types';

interface ImageUpload {
  id: string;
  data: string; // Base64 data (no prefix)
  url: string; // Data URL for display
  mimeType: string;
}

function App() {
  const [mode, setMode] = useState<PromptMode>(PromptMode.SCENE);
  
  // Scene Mode State
  const [inputText, setInputText] = useState('');

  // Character Mode State
  const [charName, setCharName] = useState('');
  const [charDesc, setCharDesc] = useState('');
  const [startingScene, setStartingScene] = useState('');

  // Image State (Multiple)
  const [selectedImages, setSelectedImages] = useState<ImageUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New State for Settings
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
      // Allow empty fields if image is present
      return (charName.trim().length > 0 && startingScene.trim().length > 0) || hasImage;
    }
  };

  // Unified File Processor (Used by Upload, Drop, and Paste)
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter images only
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) {
       if (files instanceof FileList) setError('Hanya file gambar yang didukung.');
       return;
    }

    const MAX_IMAGES = 4;
    const currentCount = selectedImages.length;
    
    if (currentCount + validFiles.length > MAX_IMAGES) {
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Paste Handler (Global)
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

  const handleRemoveImage = (idToRemove: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== idToRemove));
  };

  const handleGenerate = async () => {
    if (!isFormValid()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    let finalPrompt = inputText;
    const imageCount = selectedImages.length;
    
    // Construct sophisticated prompt instructions based on image presence
    if (imageCount > 0) {
      if (mode === PromptMode.CHARACTER) {
        const userCtx = charName || charDesc || startingScene 
          ? `User Context (Name: ${charName}, Desc: ${charDesc}, Scene: ${startingScene})`
          : "NO USER CONTEXT. STRICTLY REVERSE ENGINEER THE IMAGE.";
        
        finalPrompt = `
          [STRICT VISUAL ANALYSIS MODE]
          ${userCtx}
          
          TASK:
          1. Ignore any default assumptions. 
          2. Describe the character in the attached image EXACTLY (Face, Hair, Skin Texture, Clothing). 
          3. If the User Context contradicts the image visually (e.g. user says "blonde" but image is "dark hair"), FOLLOW THE IMAGE.
          4. Use the User Context ONLY for the acting/emotion/action, NOT for physical appearance.
        `;
      } else {
        // Scene Mode
        const userCtx = inputText ? `User Action/Context: "${inputText}"` : "NO USER CONTEXT. REPLICATE IMAGE EXACTLY.";
        
        finalPrompt = `
          [STRICT VISUAL ANALYSIS MODE]
          ${userCtx}
          
          TASK:
          1. Perform a pixel-perfect breakdown of the attached image.
          2. Extract: Lighting Setup, Focal Length, Color Palette, and Texture.
          3. The output Veo 3 prompt must generate a video that looks IDENTICAL to this starting image.
          4. Only use the "User Action" to determine what moves or happens within this existing visual scene.
        `;
      }
    } else {
      // Text Only Mode
      if (mode === PromptMode.CHARACTER) {
        finalPrompt = `Character Name: ${charName}\nCharacter Description: ${charDesc}\nInitial Scene Context: ${startingScene}`;
      }
      // else finalPrompt is already inputText
    }

    // Prepare image parts
    const imageParts = selectedImages.map(img => ({
      data: img.data,
      mimeType: img.mimeType
    }));

    try {
      const data = await generateJsonPrompt(finalPrompt, mode, settings, imageParts);
      setResult(data);
    } catch (err) {
      setError("Failed to generate prompt. Please try again or check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleGenerate();
    }
  };

  // Helper to check if we are in "Image Only" mode
  const isImageOnly = selectedImages.length > 0 && 
    (mode === PromptMode.SCENE ? !inputText : (!charName && !startingScene));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-brand-500/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-16 flex flex-col gap-12">
        
        {/* Header Section */}
        <header className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md text-xs font-medium text-brand-300 mb-4">
            <Zap size={14} className="fill-brand-300" />
            <span>Powered by Gemini 2.5 Flash</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
            Veo 3 JSON<br />Prompt Architect
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
            Lupakan kerumitan teknis. Buat JSON prompt yang detail, akurat, dan profesional untuk Veo 3 hanya dalam hitungan detik dari Ide Simpel atau Gambar.
          </p>
        </header>

        {/* Main Interface */}
        <main className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Input (Span 7/12) */}
          <section className="lg:col-span-7 space-y-6">
            <TabSelector currentMode={mode} onModeChange={setMode} />

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-1 shadow-2xl">
              <div className="bg-[#0b0f19] rounded-[1.3rem] p-6 space-y-6">
                
                {/* Dynamic Input Section based on Mode */}
                {mode === PromptMode.SCENE ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-300 ml-1">
                      Masukan Ide Video Anda
                    </label>
                    <div className="relative">
                      <textarea
                        id="prompt-input"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={selectedImages.length > 0 ? "Biarkan kosong untuk generate langsung dari gambar..." : "Contoh: Box kardus IKEA di lantai kayu yang perlahan terbuka..."}
                        className={`w-full h-40 bg-slate-950 border border-slate-800 rounded-xl p-4 text-base leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all resize-none ${selectedImages.length > 0 && !inputText ? 'ring-1 ring-brand-500/30' : ''}`}
                      />
                      {selectedImages.length > 0 && !inputText && (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="flex items-center gap-2 text-brand-500/50 font-bold uppercase tracking-widest text-sm bg-slate-950/80 px-4 py-2 rounded-full border border-brand-500/20">
                               <Eye size={16} />
                               Visual Reverse-Engineering
                            </span>
                         </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Character Name */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1">
                            Nama Karakter
                        </label>
                        <input
                            type="text"
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedImages.length > 0 ? "Auto-Generate dari gambar (opsional)" : "Anak Kecil"}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Character Description */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1">
                            Deskripsi Karakter
                        </label>
                        <textarea
                            value={charDesc}
                            onChange={(e) => setCharDesc(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedImages.length > 0 ? "Auto-Generate dari gambar (opsional)" : "Seorang anak laki laki dengan mata berbinar-binar..."}
                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-base leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Initial Scene */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1">
                            Deskripsi Adegan Awal
                        </label>
                        <textarea
                            value={startingScene}
                            onChange={(e) => setStartingScene(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedImages.length > 0 ? "Auto-Generate dari gambar (opsional)" : "Mengejar kupu-kupu di padang rumput..."}
                            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-base leading-relaxed text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all resize-none"
                        />
                    </div>
                  </div>
                )}

                {/* Multiple Image Upload Section with Drag & Drop */}
                <div 
                  className={`space-y-3 p-4 rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-brand-500 bg-brand-500/10 scale-[1.01]' : 'border-transparent'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex items-center justify-between">
                     <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase ml-1 flex items-center gap-2">
                       Gambar Referensi ({selectedImages.length}/4)
                       {isDragging && <span className="text-brand-400 animate-pulse">- Drop Here!</span>}
                     </label>
                     <div className="flex gap-4 items-center">
                        <span className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-800/50">
                           <Clipboard size={10} />
                           Paste (Ctrl+V)
                        </span>
                        {selectedImages.length > 0 && (
                          <button onClick={() => setSelectedImages([])} className="text-[10px] text-red-400 hover:text-red-300">
                            Clear All
                          </button>
                        )}
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Render Selected Images */}
                    {selectedImages.map((img) => (
                      <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                         <img src={img.url} alt="Reference" className="w-full h-full object-cover opacity-90" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => handleRemoveImage(img.id)}
                              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-transform hover:scale-110"
                            >
                              <X size={16} />
                            </button>
                         </div>
                      </div>
                    ))}

                    {/* Upload Button (Visible if < 4 images) */}
                    {selectedImages.length < 4 && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                          group aspect-square rounded-xl border-2 border-dashed bg-slate-900/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2
                          ${isDragging ? 'border-brand-400 bg-brand-500/20' : 'border-slate-800 hover:bg-slate-800 hover:border-brand-500/50'}
                        `}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                        />
                        <div className={`p-2 rounded-full transition-colors ${isDragging ? 'bg-brand-500 text-white' : 'bg-slate-800 group-hover:bg-brand-500/20 text-slate-400 group-hover:text-brand-400'}`}>
                           {isDragging ? <UploadCloud size={20} className="animate-bounce" /> : <Plus size={20} />}
                        </div>
                        <span className={`text-[10px] font-medium text-center px-2 transition-colors ${isDragging ? 'text-brand-200' : 'text-slate-500 group-hover:text-slate-300'}`}>
                          {isDragging ? "Drop to Add" : (selectedImages.length === 0 ? "Unggah / Paste / Drop" : "Tambah Gambar")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Panel Integrated Here */}
                <ConfigurationPanel settings={settings} onSettingsChange={handleSettingsChange} />

                <div className="flex items-center justify-between pt-2">
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Info size={14} />
                      <span>
                        {isImageOnly 
                          ? 'Generating precise prompt from Deep Image Analysis.' 
                          : 'Detail input provides better results.'}
                      </span>
                   </div>
                   
                   <button
                    onClick={handleGenerate}
                    disabled={loading || !isFormValid()}
                    className={`
                      group relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white shadow-lg transition-all duration-300
                      ${loading || !isFormValid() 
                        ? 'bg-slate-800 cursor-not-allowed opacity-50' 
                        : isImageOnly 
                            ? 'bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-500 hover:to-brand-400 hover:shadow-brand-500/25'
                            : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 hover:shadow-brand-500/25 hover:-translate-y-0.5'
                      }
                    `}
                   >
                     {loading ? (
                       <span className="flex items-center gap-2">
                         Processing...
                       </span>
                     ) : (
                       <>
                         <Wand2 size={20} className={isFormValid() ? "animate-pulse" : ""} />
                         <span>{isImageOnly ? 'Analyze & Generate' : 'Generate JSON'}</span>
                       </>
                     )}
                   </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Output (Span 5/12) */}
          <section className="lg:col-span-5 h-full">
            <div className="sticky top-8 space-y-4">
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <JsonDisplay data={result} loading={loading} />
              
              {result && (
                <div className="text-center">
                  <p className="text-xs text-slate-500 mt-4">
                    JSON ini siap digunakan di pipeline Veo 3 atau API video generation kompatibel lainnya.
                  </p>
                </div>
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default App;