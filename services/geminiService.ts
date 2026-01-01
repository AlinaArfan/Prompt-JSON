import { GoogleGenAI, Type } from "@google/genai";
import { PromptMode, GeneratedSceneJson, GeneratedCharacterJson, PromptSettings, GeneratedContent } from "../types.ts";

const VISUAL_SIGNATURE_SCHEMA = {
  type: Type.OBJECT,
  description: "Metadata visual mendalam yang diekstrak berdasarkan gaya visual terpilih.",
  properties: {
    detected_palette: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Palet warna yang WAJIB sesuai dengan estetika gaya (misal: neon untuk Cyberpunk)." },
    lighting_type: { type: Type.STRING, description: "Teknik pencahayaan spesifik gaya (misal: Volumetric, Rim Lighting, Cel-shaded light)." },
    camera_specs: { type: Type.STRING, description: "Lensa dan sudut kamera." },
    key_textures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tekstur material (misal: clay fingerprints, plastic studs, ink lines)." },
    environmental_mood: { type: Type.STRING, description: "Suasana atmosferik." }
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
  
  if (!process.env.API_KEY) throw new Error("API Key tidak ditemukan.");
  
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

  // Technical Style Guide for strict adherence
  const styleGuides: Record<string, string> = {
    'Default': 'Realistic, high quality, 4k resolution.',
    'Cinematic': 'Anamorphic lens, 35mm film stock, cinematic color grading, high dynamic range, chiaroscuro lighting.',
    'Anime': 'Japanese animation style, cel-shading, vibrant hand-drawn lines, sakuga quality, painterly backgrounds, no realistic textures.',
    'Cyberpunk': 'Neon-soaked aesthetic, pink and cyan color palette, rainy surfaces, volumetric fog, futuristic grit, high contrast.',
    'Lego': 'Brick-built world, plastic textures, studded surfaces, minifigure articulation, tilt-shift lens effect, 12fps stop-motion feel.',
    'Claymation': 'Tactile clay textures, visible fingerprints, stop-motion imperfections, organic lighting, chunky physical movement, Aardman aesthetic.'
  };

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
          style_implementation: { type: Type.STRING, description: `Deskripsi bagaimana elemen visual diubah menjadi gaya ${settings.visualStyle}.` }
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
            description: { type: Type.STRING, description: `Aksi yang digambarkan dengan terminologi gaya ${settings.visualStyle}.` },
            objects_in_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        minItems: exactPartCount,
        maxItems: exactPartCount
      },
      veo_optimized_prompt: { type: Type.STRING, description: `WAJIB diawali dengan: "[STYLE: ${settings.visualStyle.toUpperCase()}]"` },
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
      veo_optimized_prompt: { type: Type.STRING, description: `WAJIB diawali dengan: "[STYLE: ${settings.visualStyle.toUpperCase()}]"` },
    },
    required: ["character_profile", "visual_signature", "performance", "audio", "prompt_components", "action_description", "veo_optimized_prompt"],
  };

  const systemInstruction = `
    Anda adalah "Veo 3 Style Master Architect". 
    SANGAT PENTING: Anda harus memaksa output untuk mengikuti GAYA VISUAL: ${settings.visualStyle.toUpperCase()}.

    PROTOKOL GAYA:
    1. Jika gaya adalah ANIME, dilarang menggunakan kata "photo", "realistic", "4k photo". Gunakan "cel-shaded", "2D animation", "illustrated".
    2. Jika gaya adalah LEGO, gunakan "plastic bricks", "minifigure style", "studs".
    3. Jika gaya adalah CLAYMATION, gunakan "clay texture", "stop-motion", "fingerprints".
    
    PANDUAN TEKNIS GAYA: ${styleGuides[settings.visualStyle]}

    ANALISIS GAMBAR:
    ${hasImages ? `Ambil subjek dan komposisi dari gambar, tetapi UBAH TOTAL estetikanya menjadi gaya ${settings.visualStyle}. Jangan biarkan gambar membuat Anda menjadi realistis jika gaya yang dipilih bukan Cinematic/Default.` : ""}

    PROMPT OPTIMASI VEO:
    Format prompt akhir harus: "[STYLE: ${settings.visualStyle.toUpperCase()}][MEDIUM: ${settings.visualStyle}] (Deskripsi teknis dan aksi...)"

    DURASI: Tepat ${exactPartCount} bagian untuk ${settings.duration}.
    BAHASA: ${settings.language}.
  `;

  try {
    const contents: any = { parts: [{ text: inputText || `Create a ${settings.visualStyle} scene.` }] };
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
        temperature: 0.15, // Low temperature for high precision style adherence
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from architect.");
    return JSON.parse(text);
  } catch (error) {
    console.error("Architect Error:", error);
    throw error;
  }
};
