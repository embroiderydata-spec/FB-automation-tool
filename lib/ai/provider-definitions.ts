export interface ProviderDefinition {
  id: string;
  name: string;
  category: string;
  envVar: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
  availableModels: string[];
  tasks: string[];
  docUrl: string;
}

export const SUPPORTED_PROVIDERS: ProviderDefinition[] = [
  {
    id: "openai",
    name: "OpenAI",
    category: "LLM Scripting, Hooks & DALL-E 3 Keyframes",
    envVar: "OPENAI_API_KEY",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    availableModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "dall-e-3"],
    tasks: ["Viral Hook Generation", "Reels Scriptwriting", "Scene Direction Prompts", "9:16 Keyframe Generation"],
    docUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    category: "High-Intelligence LLM Scripting",
    envVar: "ANTHROPIC_API_KEY",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    availableModels: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    tasks: ["Long-form Content Adaptation", "Hook Variety Engine", "Creative Storyboarding"],
    docUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "groq",
    name: "Groq",
    category: "Ultra-Fast LPU Inference (Sub-second)",
    envVar: "GROQ_API_KEY",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    availableModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    tasks: ["Instantaneous Hook Generation", "Real-time Script Optimization", "Rapid Idea Mining"],
    docUrl: "https://console.groq.com/keys",
  },
  {
    id: "replicate",
    name: "Replicate",
    category: "Modular AI Video & Image Generation",
    envVar: "REPLICATE_API_TOKEN",
    defaultBaseUrl: "https://api.replicate.com/v1",
    defaultModel: "minimax/video-01",
    availableModels: ["minimax/video-01", "black-forest-labs/flux-schnell", "stability-ai/stable-video-diffusion"],
    tasks: ["9:16 Video Generation", "Flux Visual Generation", "Image-to-Video Animation"],
    docUrl: "https://replicate.com/account/api-tokens",
  },
  {
    id: "runway",
    name: "Runway",
    category: "Cinematic Gen-3 Alpha Video Synthesis",
    envVar: "RUNWAY_API_KEY",
    defaultBaseUrl: "https://api.dev.runwayml.com/v1",
    defaultModel: "gen3a_turbo",
    availableModels: ["gen3a_turbo", "gen3a"],
    tasks: ["High-Fidelity Vertical Video", "Camera Motion Control", "Dynamic B-Roll"],
    docUrl: "https://runwayml.com/account",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "Neural Human Voiceover Synthesis",
    envVar: "ELEVENLABS_API_KEY",
    defaultBaseUrl: "https://api.elevenlabs.io/v1",
    defaultModel: "eleven_multilingual_v2",
    availableModels: ["eleven_multilingual_v2", "eleven_turbo_v2_5"],
    tasks: ["Realistic Voiceovers", "Word-Level Timestamps", "Karaoke Subtitle Sync"],
    docUrl: "https://elevenlabs.io/app/settings/api-keys",
  },
  {
    id: "google",
    name: "Google AI / Gemini",
    category: "Multimodal LLM Reasoning & Vision",
    envVar: "GEMINI_API_KEY",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-1.5-pro",
    availableModels: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"],
    tasks: ["Multimodal Reel Analysis", "Trend Summarization", "Audio-Visual Coordination"],
    docUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "meta",
    name: "Meta Facebook Graph API",
    category: "Official Publishing & Insights",
    envVar: "META_APP_ID & META_APP_SECRET",
    defaultBaseUrl: "https://graph.facebook.com/v21.0",
    defaultModel: "Graph API v21.0",
    availableModels: ["Graph API v21.0"],
    tasks: ["Page OAuth Tokens", "Chunked Reels Upload", "Direct Publishing", "Page Insights"],
    docUrl: "https://developers.facebook.com/apps",
  },
];

export interface UserProviderKeyRecord {
  provider: string;
  masked_key: string;
  base_url?: string;
  default_model?: string;
  status: "connected" | "invalid_key" | "not_configured" | "error";
  last_tested_at?: string;
  last_error?: string;
  is_configured: boolean;
}
