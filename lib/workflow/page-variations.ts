import { PageVariation } from "./types";

/**
 * Calculates Jaccard token similarity between two text strings (0.0 to 1.0).
 * Lower similarity means higher originality between page variations.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;

  const tokenize = (str: string) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 2)
    );

  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  setA.forEach((token) => {
    if (setB.has(token)) {
      intersectionSize++;
    }
  });

  const unionSet = new Set<string>();
  setA.forEach((t) => unionSet.add(t));
  setB.forEach((t) => unionSet.add(t));
  const unionSize = unionSet.size;
  return unionSize > 0 ? parseFloat((intersectionSize / unionSize).toFixed(3)) : 0;
}

export interface VariationGenerateOptions {
  baseTitle: string;
  baseHook: string;
  baseNarration: string;
  baseHashtags?: string[];
  pages: Array<{
    id: string;
    page_name: string;
    niche?: string | null;
    tone?: string | null;
  }>;
}

/**
 * Generates distinct, personalized caption, hook, and hashtag variations
 * for each targeted Facebook Page to eliminate duplicate content distribution penalties.
 */
export function generatePageVariations(options: VariationGenerateOptions): PageVariation[] {
  const { baseTitle, baseHook, baseNarration, baseHashtags = [], pages } = options;

  const hookStyles = [
    (h: string, title: string) => `Wait until you see this: ${h}`,
    (h: string, title: string) => `Stop scrolling — ${h}`,
    (h: string, title: string) => `Nobody talks about this: ${h}`,
    (h: string, title: string) => `Here's what they won't tell you about ${title}: ${h}`,
    (h: string, title: string) => `Save this before you forget: ${h}`,
    (h: string, title: string) => `Did you know? ${h}`,
  ];

  const callToActions = [
    "Drop a comment if you agree! 👇 Follow for more daily updates.",
    "Share this with someone who needs to see it! 🚀 Follow for daily insights.",
    "What are your thoughts on this? Let us know below! 💬",
    "Hit follow so you never miss another tip! 🔔 Save for later.",
    "Tag a friend who would love this! ✨ Follow our page.",
  ];

  const hashtagPool = [
    "#reels",
    "#viral",
    "#trending",
    "#fbreels",
    "#fyp",
    "#mindset",
    "#growth",
    "#knowledge",
    "#creator",
    "#insights",
    ...baseHashtags,
  ];

  const variations: PageVariation[] = [];

  pages.forEach((page, index) => {
    // Generate distinct hook for this page
    const hookTransform = hookStyles[index % hookStyles.length];
    const customHook = index === 0 ? baseHook : hookTransform(baseHook, baseTitle);

    // Pick personalized CTA and hashtags
    const cta = callToActions[index % callToActions.length];

    // Pick distinct subset of hashtags
    const selectedHashtags = Array.from(
      new Set([
        ...baseHashtags.slice(0, 3),
        hashtagPool[(index * 2) % hashtagPool.length],
        hashtagPool[(index * 2 + 1) % hashtagPool.length],
        `#${page.page_name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      ])
    ).slice(0, 6);

    // Construct variation caption
    const caption = [
      customHook,
      "",
      baseNarration.length > 200 ? baseNarration.substring(0, 180) + "..." : baseNarration,
      "",
      cta,
      "",
      selectedHashtags.join(" "),
    ].join("\n");

    // Calculate maximum similarity against already generated variations
    let maxSimilarity = 0;
    for (const prev of variations) {
      const sim = calculateTextSimilarity(caption, prev.caption);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
      }
    }

    variations.push({
      page_id: page.id,
      page_name: page.page_name,
      custom_hook: customHook,
      caption,
      hashtags: selectedHashtags,
      watermark_text: page.page_name,
      similarity_score: maxSimilarity,
    });
  });

  return variations;
}

/**
 * Validates whether any pair of page variations exceeds the duplicate content threshold (> 0.75).
 */
export function validateDuplicateContentMatrix(variations: PageVariation[]): {
  isSafe: boolean;
  warnings: Array<{ pageA: string; pageB: string; similarity: number }>;
} {
  const warnings: Array<{ pageA: string; pageB: string; similarity: number }> = [];

  for (let i = 0; i < variations.length; i++) {
    for (let j = i + 1; j < variations.length; j++) {
      const sim = calculateTextSimilarity(variations[i].caption, variations[j].caption);
      if (sim > 0.75) {
        warnings.push({
          pageA: variations[i].page_name,
          pageB: variations[j].page_name,
          similarity: sim,
        });
      }
    }
  }

  return {
    isSafe: warnings.length === 0,
    warnings,
  };
}
