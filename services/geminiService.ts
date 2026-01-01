import { GoogleGenAI, Type } from "@google/genai";
import { PromptMode, GeneratedSceneJson, GeneratedCharacterJson, PromptSettings, GeneratedContent } from "../types.ts";

const VISUAL_SIGNATURE_SCHEMA = {
  type: Type.OBJECT,
  description: "Metadata visual mendalam yang diekstrak dari gambar referensi atau gaya yang dipilih.",
  properties: {
    detected_palette: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Kode hex atau nama warna dominan sesuai gaya." },
    lighting_type: { type: Type.STRING, description: "Jenis pencahayaan (misal: Rim lighting, Golden hour, Softbox)." },
    camera_specs: { type: Type.STRING, description: "Lensa dan sudut kamera yang terdeteksi." },
    key_textures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detail tekstur (misal: metalik, cel-shaded, plastic brick)." },
    environmental_mood: { type: Type.STRING, description: "Atmosfer emosional dari gambar." }
  },
  required: ["detected_palette", "lighting_type", "camera_specs", "key_textures", "environmental_mood"]
};

const PROMPT_COMPONENTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subject_action: { type: Type.STRING },
    environment_context: { type: Type.STRING },
    lighting_atmosphere: { type: Type.STRING },
    camera_technical: { type: Type.STRING },
    texture_details: { type: Type.STRING },
  },
  required: ["subject_action", "environment_context", "lighting_atmosphere", "camera_technical", "texture_details"],
};

const AUDIO_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    music_theme: { type: Type.STRING },
    sound_effects: { type: Type.ARRAY, items: { type: Type.STRING } },
    audio_prompt: { type: Type.STRING }
  },
  required: ["music_theme", "audio_prompt"]
};

export const generateJsonPrompt = async (
  inputText: string, 
  mode: PromptMode,
  settings: PromptSettings,
  imageParts?: { data: string; mimeType: string }[]
): Promise<GeneratedContent> => {
  
  if (!process.env.API_KEY) throw new Error("API Key tidak ditemukan di environment.");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-preview";
  const isScene = mode === PromptMode.SCENE;
  const hasImages = imageParts && imageParts.length > 0;

  const partCountMap: Record<string, number> = {
    '15s': 3,
    '30s': 5,
    '1m': 10,
    '2m': 18
  };
  const exactPartCount = partCountMap[settings.duration] || 3;

  // Definisi karakteristik gaya visual untuk memperkuat model
  const styleGuides: Record<string, string> = {
    'Cinematic': 'Gunakan anamorphic flare, high dynamic range, 35mm film grain, dan pencahayaan dramatis (chiaroscuro).',
    'Anime': 'Gunakan cel-shading, vibrant colors, expressive lines, sakuga-style animation, dan painterly background textures.',
    'Cyberpunk': 'Gunakan neon lighting (pink/cyan), rainy streets, high-tech grit, volumetric fog, dan retro-futuristic aesthetics.',
    'Lego': 'Gunakan plastic textures, studded surfaces, minifigure articulation, brick-built environments, dan stop-motion jitter.',
    'Claymation': 'Gunakan fingerprint textures on clay, stop-motion imperfections, tactile organic lighting, dan chunky character shapes.'
  };

  const currentStyleGuide = styleGuides[settings.visualStyle] || 'Gunakan gaya visual yang realistis dan mendetail.';

  const SCENE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      visual_signature: VISUAL_SIGNATURE_SCHEMA,
      technical: {
        type: Type.OBJECT,
        properties: {
          aspect_ratio: { type: Type.STRING },
          camera_movement: { type: Type.STRING },
          lens_type: { type: Type.STRING },
          resolution: { type: Type.STRING },
          fps: { type: Type.NUMBER },
        },
        required: ["aspect_ratio", "camera_movement", "lens_type"],
      },
      visuals: {
        type: Type.OBJECT,
        properties: {
          lighting_style: { type: Type.STRING },
          color_grading: { type: Type.STRING },
          atmosphere: { type: Type.STRING },
          style_implementation: { type: Type.STRING, description: `Bagaimana gaya ${settings.visualStyle} diterapkan secara teknis.` }
        },
      },
      audio: AUDIO_SCHEMA,
      prompt_components: PROMPT_COMPONENTS_SCHEMA,
      timeline: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            timestamp: { type: Type.STRING },
            description: { type: Type.STRING, description: `Deskripsi aksi yang WAJIB konsisten dengan gaya ${settings.visualStyle}.` },
            objects_in_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        minItems: exactPartCount,
        maxItems: exactPartCount
      },
      veo_optimized_prompt: { type: Type.STRING, description: `Prompt final. Harus diawali dengan gaya visual: "[STYLE: ${settings.visualStyle.toUpperCase()}] ..."` },
    },
    required: ["title", "visual_signature", "technical", "visuals", "audio", "prompt_components", "timeline", "veo_optimized_prompt"],
  };

  const CHARACTER_SCHEMA = {
    type: Type.OBJECT,
    properties: {
      character_profile: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          age_range: { type: Type.STRING },
          distinctive_features: { type: Type.STRING },
          outfit: { type: Type.STRING },
        },
        required: ["name", "distinctive_features", "outfit"],
      },
      visual_signature: VISUAL_SIGNATURE_SCHEMA,
      performance: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING },
          body_language: { type: Type.STRING },
          eye_contact: { type: Type.STRING },
        },
      },
      audio: AUDIO_SCHEMA,
      prompt_components: PROMPT_COMPONENTS_SCHEMA,
      dialogue_sequence: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            speaker: { type: Type.STRING },
            line: { type: Type.STRING },
            emotion: { type: Type.STRING },
          },
        },
        minItems: exactPartCount,
        maxItems: exactPartCount
      },
      action_description: { type: Type.STRING },
      veo_optimized_prompt: { type: Type.STRING, description: `Prompt final. Harus diawali dengan gaya visual: "[STYLE: ${settings.visualStyle.toUpperCase()}] ..."` },
    },
    required: ["character_profile", "visual_signature", "performance", "audio", "prompt_components", "action_description", "veo_optimized_prompt"],
  };

  const systemInstruction = `
    Anda adalah "Veo 3 Master Architect" kelas dunia. 
    Tugas Anda: Membuat JSON Prompt yang sangat akurat dengan gaya visual yang diminta.

    GAYA VISUAL WAJIB: ${settings.visualStyle.toUpperCase()}
    PANDUAN GAYA: ${currentStyleGuide}

    INSTRUKSI KHUSUS:
    1. TIMELINE & DESKRIPSI: Setiap kalimat dalam timeline harus mencerminkan estetika ${settings.visualStyle}. 
       - Jika Anime, sebutkan "vibrant cel-shading" atau "painterly light".
       - Jika Lego, sebutkan "plastic reflection" atau "studded floor".
    2. VEO OPTIMIZED PROMPT: Awali prompt ini dengan "[STYLE: ${settings.visualStyle.toUpperCase()}]". Ini sangat krusial agar model Veo 3 memahami konteks utama.
    3. DURASI: Hasilkan tepat ${exactPartCount} part untuk durasi ${settings.duration}.
    
    ANALISIS VISUAL (GAMBAR):
    ${hasImages ? `Gunakan gambar yang diupload sebagai referensi utama untuk objek, wajah, dan pencahayaan, tapi terjemahkan ke dalam gaya ${settings.visualStyle}.` : ""}
    
    Bahasa Output: ${settings.language}
    Kompleksitas: ${settings.complexity}
  `;

  try {
    const contents: any = { parts: [{ text: inputText || `Generate a ${settings.visualStyle} masterpiece based on visuals.` }] };
    if (hasImages) {
      imageParts.forEach(img => {
        contents.parts.push({
          inlineData: { mimeType: img.mimeType, data: img.data }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: isScene ? SCENE_SCHEMA : CHARACTER_SCHEMA,
        temperature: hasImages ? 0.2 : 0.65, // Temperatur rendah untuk kepatuhan gaya yang lebih ketat
      },
    });

    const text = response.text;
    if (!text) throw new Error("Model gagal memberikan respon.");
    return JSON.parse(text);
  } catch (error) {
    console.error("Architect Error:", error);
    throw error;
  }
};
