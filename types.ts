export enum PromptMode {
  SCENE = 'SCENE',
  CHARACTER = 'CHARACTER'
}

export type DurationOption = '15s' | '30s' | '1m' | '2m';
export type LanguageOption = 'Indonesia' | 'Inggris';
export type ComplexityLevel = 'Simple' | 'Detail' | 'Complex';
export type MusicTheme = 'Cinematic' | 'Electronic' | 'Horror' | 'Lo-fi';
export type VisualStyle = 'Default' | 'Cinematic' | 'Anime' | 'Cyberpunk' | 'Lego' | 'Claymation';
export type AspectRatio = '16:9' | '9:16' | '1:1' | '21:9' | '4:3';

export interface PromptSettings {
  duration: DurationOption;
  language: LanguageOption;
  complexity: ComplexityLevel;
  musicTheme: MusicTheme;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
}

export interface VisualSignature {
  detected_palette: string[];
  lighting_type: string;
  camera_specs: string;
  key_textures: string[];
  environmental_mood: string;
}

export interface PromptComponents {
  subject_action: string;
  environment_context: string;
  lighting_atmosphere: string;
  camera_technical: string;
  texture_details: string;
}

export interface AudioSettings {
  music_theme: string;
  sound_effects: string[];
  audio_prompt: string;
}

export interface GeneratedSceneJson {
  title: string;
  visual_signature?: VisualSignature;
  technical: {
    aspect_ratio: string;
    camera_movement: string;
    lens_type: string;
    resolution: string;
    fps: number;
  };
  visuals: {
    lighting_style: string;
    color_grading: string;
    atmosphere: string;
  };
  audio: AudioSettings;
  prompt_components: PromptComponents;
  timeline: Array<{
    timestamp: string;
    description: string;
    objects_in_focus: string[];
  }>;
  veo_optimized_prompt: string;
}

export interface GeneratedCharacterJson {
  character_profile: {
    name: string;
    age_range: string;
    distinctive_features: string;
    outfit: string;
  };
  visual_signature?: VisualSignature;
  performance: {
    expression: string;
    body_language: string;
    eye_contact: string;
  };
  audio: AudioSettings;
  prompt_components: PromptComponents;
  dialogue_sequence?: Array<{
    speaker: string;
    line: string;
    emotion: string;
  }>;
  action_description: string;
  veo_optimized_prompt: string;
}

export type GeneratedContent = GeneratedSceneJson | GeneratedCharacterJson;

export interface HistoryItem {
  id: string;
  mode: PromptMode;
  input: string;
  output: GeneratedContent;
  timestamp: number;
}