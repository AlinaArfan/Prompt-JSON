import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PromptMode, GeneratedSceneJson, GeneratedCharacterJson, PromptSettings } from "../types.ts";

const VISUAL_SIGNATURE_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: "Detailed metadata extracted from the reference images.",
  properties: {
    detected_palette: { type: Type.ARRAY, items: { type: Type.STRING } },
    lighting_type: { type: Type.STRING },
    camera_specs: { type: Type.STRING },
    key_textures: { type: Type.ARRAY, items: { type: Type.STRING } },
    environmental_mood: { type: Type.STRING }
  },
  required: ["detected_palette", "lighting_type", "camera_specs", "key_textures", "environmental_mood"]
};

const PROMPT_COMPONENTS_SCHEMA: Schema = {
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

const AUDIO_SCHEMA: Schema = {
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
): Promise<GeneratedSceneJson | GeneratedCharacterJson> => {
  
  // Safe initialization inside the function scope
  const apiKey = (process.env as any).API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey });

  const modelId = "gemini-2.5-flash";
  const isScene = mode === PromptMode.SCENE;
  const hasImages = imageParts && imageParts.length > 0;

  const partCountMap: Record<string, number> = {
    '15s': 2,
    '30s': 4,
    '1m': 8,
    '2m': 15
  };
  const exactPartCount = partCountMap[settings.duration] || 2;

  const SCENE_SCHEMA: Schema = {
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

  const CHARACTER_SCHEMA: Schema = {
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
    Director of Photography (DoP) Expert for "Veo 3".
    Duration: ${settings.duration}. Output EXACTLY ${exactPartCount} items in the sequence array.
    ${hasImages ? "PRIORITIZE IMAGE PIXELS. Maintain exact character features and lighting from the uploaded image." : ""}
    Language: ${settings.language}.
  `;

  try {
    const contents: any = { parts: [{ text: inputText }] };
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
        temperature: hasImages ? 0.2 : 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};