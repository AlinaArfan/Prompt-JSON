
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
  
  if (!process.env.API_KEY) {
    console.error("Critical: API Key is missing in process.env");
    throw new Error("API Key tidak ditemukan. Pastikan sudah diatur di environment.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Menggunakan Flash untuk kecepatan di Vercel agar tidak timeout
  const modelId = "gemini-3-flash-preview";
  const isScene = mode === PromptMode.SCENE;
  const hasImages = imageParts && imageParts.length > 0;

  const partCountMap: Record<string, number> = {
    '15s': 3,
    '30s': 5,
    '1m': 10,
    '2m': 18
  };
  const exactPartCount = partCountMap[settings.duration] || 3;

  const styleGuides: Record<string, string> = {
    'Default': 'Realistic, photo-real, high-fidelity.',
    'Cinematic': 'Anamorphic flare, 35mm grain, moody lighting, HDR.',
    'Anime': '2D aesthetic, cel-shading, ink outlines, painted backgrounds. NO REALISM.',
    'Cyberpunk': 'Neon glow, futuristic tech, rainy streets, high contrast cyan/magenta.',
    'Lego': 'Everything made of plastic bricks, studs visible, stop-motion animation style.',
    'Claymation': 'Hand-crafted clay, fingerprints visible, tactile organic lighting, stop-motion.'
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
          style_implementation: { type: Type.STRING }
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
            description: { type: Type.STRING },
            objects_in_focus: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
        },
        minItems: exactPartCount,
        maxItems: exactPartCount
      },
      veo_optimized_prompt: { type: Type.STRING },
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
      veo_optimized_prompt: { type: Type.STRING },
    },
    required: ["character_profile", "visual_signature", "performance", "audio", "prompt_components", "action_description", "veo_optimized_prompt"],
  };

  const systemInstruction = `
    Role: Senior Video Architect for Veo 3.
    Mandatory Style: ${settings.visualStyle.toUpperCase()}
    Style Rules: ${styleGuides[settings.visualStyle]}

    Strict Visual Enforcement:
    1. If style is Anime, Lego, or Claymation: FORBID photographic words. 
    2. Instead of "realistic", use "${settings.visualStyle} consistent rendering".
    3. The "veo_optimized_prompt" MUST start with: "[STYLE: ${settings.visualStyle.toUpperCase()}]".
    4. Each timeline description must be stylized (e.g., "The Lego character jumps over brick-built obstacles").

    Configuration:
    - Language: ${settings.language}
    - Duration: ${settings.duration} (Generate exactly ${exactPartCount} steps)
    - Complexity: ${settings.complexity}
    ${hasImages ? "Reference images are provided. TRANSLATE their content into the requested style." : ""}
  `;

  try {
    const contents: any = { parts: [{ text: inputText || `Create a ${settings.visualStyle} scene based on the visuals.` }] };
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
        temperature: 0.1, // Near deterministic for high accuracy
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty model response.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Architect Error:", error);
    throw error;
  }
};
