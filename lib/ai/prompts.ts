export interface PageNicheSettings {
  page_name?: string;
  niche?: string | null;
  sub_niche?: string | null;
  target_audience?: string | null;
  target_country?: string | null;
  language?: string | null;
  ai_tone?: string | null;
  content_style?: string | null;
  page_description?: string | null;
  topics_to_cover?: string[] | null;
  topics_to_avoid?: string[] | null;
  preferred_content_format?: string | null;
  originality_guidelines?: string | null;
  video_duration_min?: number | null;
  video_duration_max?: number | null;
}

/**
 * Builds a comprehensive niche context block tailored specifically to a Facebook Page.
 */
export function buildNicheContext(settings?: PageNicheSettings): string {
  if (!settings) {
    return "PAGE PROFILE: General Facebook Reels audience, English, entertaining and engaging tone, 30-45s vertical format.";
  }

  const lines = [
    `PAGE PROFILE: ${settings.page_name || "Facebook Page"}`,
    `Niche: ${settings.niche || "General Content"}`,
    settings.sub_niche ? `Sub-Niche: ${settings.sub_niche}` : null,
    `Target Audience: ${settings.target_audience || "General Public"} (Country: ${settings.target_country || "US"})`,
    `Target Language: ${settings.language || "en"}`,
    `Tone of Voice: ${settings.ai_tone || "engaging, lively"}`,
    `Content Style: ${settings.content_style || "short-form storytelling"}`,
    settings.page_description ? `Page About / Brand Ethos: ${settings.page_description}` : null,
    settings.topics_to_cover && settings.topics_to_cover.length > 0
      ? `Priority Topics to Cover: ${settings.topics_to_cover.join(", ")}`
      : null,
    settings.topics_to_avoid && settings.topics_to_avoid.length > 0
      ? `STRICTLY AVOID: ${settings.topics_to_avoid.join(", ")}`
      : null,
    `Format: ${settings.preferred_content_format || "Facebook Reels 9:16 vertical video"}`,
    `Duration Window: ${settings.video_duration_min || 30} to ${settings.video_duration_max || 60} seconds`,
    settings.originality_guidelines
      ? `Originality Standards: ${settings.originality_guidelines}`
      : "Originality Standards: 100% unique angles, zero generic filler, high retention hook in first 3 seconds.",
  ];

  return lines.filter(Boolean).join("\n");
}

/**
 * System prompt for Content Idea generation
 */
export function buildIdeaGenerationPrompt(
  pageContext: string,
  options: {
    topic?: string;
    category?: string;
    duration?: number;
    numIdeas?: number;
  }
) {
  const count = options.numIdeas || 3;
  const targetTopic = options.topic ? `Focus on the specific theme/topic: "${options.topic}".` : "Explore fresh viral topic angles relevant to this page's niche.";
  const categoryNote = options.category ? `Category constraint: ${options.category}.` : "";

  const system = `You are an elite short-form video content strategist specializing in Facebook Reels.
Your objective is to generate highly engaging, original content ideas tailored specifically to the given Facebook Page niche.
You must adhere strictly to the Page profile, tone, audience demographics, and safety guidelines.
Avoid deceptive clickbait or banned sensationalism.
Output MUST be valid JSON adhering strictly to the requested schema.`;

  const user = `${pageContext}

TASK: Generate ${count} distinct, high-potential Facebook Reels content ideas.
${targetTopic}
${categoryNote}

Required JSON Output Format:
{
  "ideas": [
    {
      "title": "Snappy, engaging title under 70 characters",
      "description": "2-3 sentence summary of the video narrative and visual concept",
      "category": "Content category (e.g. Life Hack, Storytime, Tutorial, Curated Trivia, Comedy Skit)",
      "target_audience": "Specific audience segment targeted",
      "viral_potential": "Why this will perform well on Facebook Reels algorithm (retention driver, shareability)",
      "suggested_hook": "A punchy first-sentence opening hook (under 15 words)",
      "suggested_duration_seconds": 45,
      "content_format": "9:16 Vertical Reel",
      "originality_notes": "Unique angle differentiating this from generic content on the topic"
    }
  ]
}`;

  return { system, user };
}

/**
 * System prompt for Viral Hook generation
 */
export function buildHookGenerationPrompt(
  pageContext: string,
  options: {
    topic: string;
    ideaTitle?: string;
    hookStyle?: string;
    numHooks?: number;
  }
) {
  const count = options.numHooks || 5;
  const style = options.hookStyle || "curiosity";

  const system = `You are a viral retention specialist for Facebook Reels and short-form video.
Your mission is to craft irresistible video opening hooks designed to stop the scroll within the first 3 seconds.
The hooks must feel authentic, punchy, conversational, and completely relevant to the topic and target audience.
Rules:
- Never fabricate false facts or use cheap banned clickbait.
- Hook must be concise (spoken in 2 to 4 seconds, roughly 8 to 20 words).
- Hook style: ${style.toUpperCase()}.
Output MUST be valid JSON.`;

  const user = `${pageContext}

TOPIC: ${options.topic}
${options.ideaTitle ? `CONTENT IDEA: ${options.ideaTitle}` : ""}
REQUESTED HOOK STYLE: ${style}

Generate at least ${count} unique, high-converting opening hooks in the style "${style}".

Required JSON Output Format:
{
  "hooks": [
    {
      "hook_text": "The exact spoken words for the first 3 seconds",
      "style": "${style}",
      "angle_explanation": "Why this hook triggers curiosity or emotion without being misleading",
      "estimated_seconds": 3
    }
  ]
}`;

  return { system, user };
}

/**
 * System prompt for Script generation
 */
export function buildScriptGenerationPrompt(
  pageContext: string,
  options: {
    title?: string;
    hook: string;
    topic: string;
    targetDurationSeconds?: number;
    tone?: string;
    language?: string;
  }
) {
  const duration = options.targetDurationSeconds || 45;
  // Rule of thumb for speech: 2.3 to 2.5 words per second
  const targetWords = Math.round(duration * 2.4);

  const system = `You are an expert short-form scriptwriter for viral Facebook Reels.
You write scripts that captivate viewers from the opening hook to the final payoff, maintaining rapid pacing and high viewer retention.
Script Structure:
1. Opening Hook (0-3s): The exact agreed hook.
2. Introduction (3-8s): Establish stakes, question, or intrigue immediately.
3. Main Content (8-25s): Core substance, engaging story beats, or actionable insights.
4. Story Progression / Climax (25-38s): Surprising twist, climax, or high-value takeaway.
5. Payoff & Ending (38-45s): Satisfying resolution and subtle engagement prompt (call to action).

Constraints:
- Target speech duration: ~${duration} seconds.
- Total word count target: approximately ${targetWords} words (±10 words).
- Language: ${options.language || "English"}.
- Tone: ${options.tone || "engaging, lively, conversational"}.
Output MUST be valid JSON.`;

  const user = `${pageContext}

VIDEO TOPIC: ${options.topic}
${options.title ? `WORKING TITLE: ${options.title}` : ""}
MANDATORY OPENING HOOK: "${options.hook}"
TARGET DURATION: ${duration} seconds (~${targetWords} words total speech)

Generate a complete, production-ready Facebook Reels script.

Required JSON Output Format:
{
  "script": {
    "title": "Catchy Facebook Reel Title",
    "hook": "${options.hook}",
    "full_narration": "Full continuous voiceover script text with natural punctuation for speech synthesis...",
    "estimated_duration_seconds": ${duration},
    "word_count": ${targetWords},
    "scenes_breakdown": [
      {
        "scene_number": 1,
        "timing": "00:00 - 00:03",
        "narration": "Exact line spoken in this scene",
        "visual_cue": "Brief description of what is visible on screen"
      }
    ],
    "suggested_ending": "Satisfying payoff and closing line",
    "caption": "High-converting Facebook post caption (2-3 sentences with hook and discussion question)",
    "hashtags": ["#Reels", "#ViralReels", "#TopicNiche"]
  }
}`;

  return { system, user };
}

/**
 * System prompt for Storyboard Builder
 */
export function buildStoryboardPrompt(
  pageContext: string,
  script: {
    title: string;
    hook: string;
    full_narration: string;
    estimated_duration_seconds: number;
  }
) {
  const system = `You are a professional video director and AI cinematographer for 9:16 vertical short-form video (Facebook Reels).
Your job is to convert a complete narration script into an exquisite, scene-by-scene storyboard ready for AI video generation models (Runway, Sora, Midjourney/Replicate, Luma).
Requirements:
- Video format is strictly 9:16 vertical (1080x1920 mobile viewport).
- Each scene must be between 2.5 and 5.0 seconds long to maintain rapid visual pacing.
- The total duration of all scenes must equal the script duration (~${script.estimated_duration_seconds}s).
- Visual descriptions must specify realistic lighting, colors, framing, and environment details.
- Provide high-fidelity AI video prompts (prompt engineers' phrasing, photo-realistic, cinematic lighting, 8k resolution, vertical 9:16 framing).
- Include camera direction (e.g. macro close-up, low-angle tracking shot, fast forward push).
- Include motion description (subject movement and camera movement).
- Include transitions, on-screen text overlays, and sound effects.
Output MUST be valid JSON.`;

  const user = `${pageContext}

SCRIPT TITLE: ${script.title}
HOOK: "${script.hook}"
FULL NARRATION:
"""
${script.full_narration}
"""
TOTAL ESTIMATED DURATION: ${script.estimated_duration_seconds} seconds

Break this script into sequential vertical 9:16 scenes (typically 7 to 12 scenes for a 30-45s Reel).

Required JSON Output Format:
{
  "storyboard": {
    "total_scenes": 8,
    "scenes": [
      {
        "scene_number": 1,
        "start_time": 0.0,
        "end_time": 3.0,
        "duration": 3.0,
        "narration": "Line spoken during this scene...",
        "visual_description": "Detailed visual description of characters, environment, action, and lighting",
        "video_prompt": "Cinematic 9:16 vertical video prompt, 8k resolution, photorealistic, dramatic studio lighting, 35mm lens...",
        "camera_direction": "Extreme close-up, slow push-in",
        "motion_description": "Character looks directly into lens with surprised reaction",
        "transition": "Quick whip cut",
        "on_screen_text": "DON'T MISS THIS",
        "sound_effect": "Low frequency cinematic sub-bass drop",
        "scene_type": "opening"
      }
    ]
  }
}`;

  return { system, user };
}

/**
 * System prompt to regenerate an individual storyboard scene
 */
export function buildSingleSceneRegenPrompt(
  pageContext: string,
  scriptTitle: string,
  sceneNumber: number,
  existingScene: {
    duration: number;
    narration: string;
    scene_type: string;
  },
  userFeedback?: string
) {
  const system = `You are an AI cinematographer refining a single scene in a 9:16 vertical Facebook Reel storyboard.
Output MUST be valid JSON adhering strictly to the schema for one scene.`;

  const user = `${pageContext}

SCRIPT TITLE: ${scriptTitle}
SCENE NUMBER: ${sceneNumber}
SCENE TYPE: ${existingScene.scene_type}
DURATION: ${existingScene.duration}s
NARRATION: "${existingScene.narration}"
${userFeedback ? `USER FEEDBACK/REVISION REQUEST: ${userFeedback}` : "Generate a fresh, more compelling visual angle and AI video prompt for this scene."}

Output JSON:
{
  "scene": {
    "scene_number": ${sceneNumber},
    "visual_description": "New refreshed visual description...",
    "video_prompt": "Enhanced AI video generation prompt...",
    "camera_direction": "Camera framing and lens angle...",
    "motion_description": "Subject and camera movement...",
    "transition": "Transition effect...",
    "on_screen_text": "On screen text...",
    "sound_effect": "Sound effect suggestion..."
  }
}`;

  return { system, user };
}
