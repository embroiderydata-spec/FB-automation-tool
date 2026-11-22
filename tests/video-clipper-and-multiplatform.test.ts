import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";
import { saveUserClip, getUserClips, deleteUserClip } from "../lib/clipper/storage";
import {
  probeVideoFile,
  renderVideoClip,
  formatBytes,
  getFFmpegPath,
} from "../lib/clipper/ffmpeg-engine";
import {
  parseVideoUrl,
  formatTimestamp,
  parseTimestamp,
  analyzeVideoViralMoments,
  searchTranscriptForTopic,
} from "../lib/clipper/ai-analyzer";
import {
  getYouTubeAuthUrl,
  getYouTubeRedirectUri,
  saveYouTubeAccount,
  getYouTubeAccounts,
  disconnectYouTubeAccount,
  saveYouTubeUploadRecord,
  getYouTubeUploadHistory,
  deleteYouTubeUploadRecord,
} from "../lib/publishing/youtube";
import { navigationItems } from "../components/dashboard/sidebar";
import { PublishNowSchema, SchedulePostSchema } from "../lib/validations/publishing";
import {
  getRenderBaseDir,
  createJobTempDir,
  cleanupJobTempDir,
  sanitizeErrorMessage,
} from "../lib/clipper/render-storage";
import {
  createClipRenderJob,
  updateClipRenderJob,
  getClipRenderJob,
  getUserClipRenderJobs,
  cancelClipRenderJob,
} from "../lib/clipper/render-jobs";
import { executeRenderJob } from "../lib/clipper/render-manager";
import * as os from "os";

describe("Video Clipper Studio & Multi-Platform Publishing", () => {
  const testUserId = "test-user-clipper-" + Date.now();
  const testDir = path.join(process.cwd(), ".data", "test_suite");
  const testVideoPath = path.join(testDir, "test_input.mp4");

  // Create real test video if ffmpeg available
  test("setup: generates a real 5-second test MP4 for clipping tests", () => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const ffmpeg = getFFmpegPath();
    const res = spawnSync(ffmpeg, [
      "-y",
      "-f", "lavfi", "-i", "testsrc=duration=5:size=1920x1080:rate=30",
      "-f", "lavfi", "-i", "sine=frequency=1000:duration=5",
      "-c:v", "libx264", "-c:a", "aac",
      testVideoPath,
    ]);
    assert.strictEqual(res.status, 0);
    assert.ok(fs.existsSync(testVideoPath));
    assert.ok(fs.statSync(testVideoPath).size > 0);
  });

  describe("1. Real FFmpeg Video Processing & Probing", () => {
    test("probeVideoFile accurately extracts real duration, width, height and resolution", () => {
      const probe = probeVideoFile(testVideoPath);
      assert.ok(probe);
      assert.strictEqual(probe.width, 1920);
      assert.strictEqual(probe.height, 1080);
      assert.strictEqual(probe.resolution, "1920x1080");
      assert.ok(probe.duration >= 4.9 && probe.duration <= 5.1);
    });

    test("renderVideoClip trims exact duration and crops to 9:16 vertical (1080x1920)", async () => {
      const out9x16 = path.join(testDir, "output_9x16.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: out9x16,
        startTime: 1.0,
        duration: 2.5,
        aspectRatio: "9:16",
        cropPosition: "center",
        resolution: "1080p",
      });

      assert.ok(fs.existsSync(out9x16));
      assert.ok(result.sizeBytes > 0);
      assert.strictEqual(result.duration, 2.5);

      // Verify the rendered video actually has 1080x1920 dimensions
      const probeOut = probeVideoFile(out9x16);
      assert.strictEqual(probeOut.width, 1080);
      assert.strictEqual(probeOut.height, 1920);
      assert.strictEqual(probeOut.resolution, "1080x1920");
      assert.ok(probeOut.duration >= 2.4 && probeOut.duration <= 2.6);
    });

    test("renderVideoClip crops to 1:1 square (1080x1080)", async () => {
      const out1x1 = path.join(testDir, "output_1x1.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: out1x1,
        startTime: 0.5,
        duration: 2.0,
        aspectRatio: "1:1",
        cropPosition: "center",
        resolution: "1080p",
      });

      assert.ok(fs.existsSync(out1x1));
      assert.ok(result.sizeBytes > 0);

      const probeOut = probeVideoFile(out1x1);
      assert.strictEqual(probeOut.width, 1080);
      assert.strictEqual(probeOut.height, 1080);
    });

    test("formatBytes formats file sizes correctly", () => {
      assert.strictEqual(formatBytes(15728640), "15.0 MB");
      assert.strictEqual(formatBytes(1048576), "1.0 MB");
      assert.strictEqual(formatBytes(0), "0 MB");
    });
  });

  describe("2. Video Clipper Storage & Lifecycle", () => {
    test("should successfully save a new 9:16 vertical video clip", async () => {
      const clip = await saveUserClip(testUserId, {
        source_video_url: "https://example.com/source.mp4",
        source_video_name: "Source Vlog.mp4",
        clip_title: "Viral Hook Scene",
        caption: "#reels #shorts #viral",
        start_time: 10.5,
        end_time: 40.5,
        duration: 30.0,
        aspect_ratio: "9:16",
        crop_position: "center",
        resolution: "1080p",
        subtitle_text: "WAIT TILL THE END 😱",
        file_size: 1542890,
      });

      assert.ok(clip);
      assert.ok(clip.id);
      assert.strictEqual(clip.user_id, testUserId);
      assert.strictEqual(clip.aspect_ratio, "9:16");
      assert.strictEqual(clip.crop_position, "center");
      assert.strictEqual(clip.duration, 30.0);
      assert.strictEqual(clip.subtitle_text, "WAIT TILL THE END 😱");
    });

    test("should retrieve saved clips for the user", async () => {
      const clips = await getUserClips(testUserId);
      assert.ok(Array.isArray(clips));
      assert.ok(clips.length > 0);
      assert.strictEqual(clips[0].clip_title, "Viral Hook Scene");
    });

    test("should allow deleting a saved clip", async () => {
      const clips = await getUserClips(testUserId);
      const clipId = clips[0].id;

      const deleted = await deleteUserClip(testUserId, clipId);
      assert.strictEqual(deleted, true);

      const afterClips = await getUserClips(testUserId);
      assert.strictEqual(afterClips.some((c) => c.id === clipId), false);
    });
  });

  describe("3. YouTube OAuth & Multi-Platform Integration", () => {
    test("should generate a valid Google OAuth consent URL for YouTube scopes", () => {
      const authUrl = getYouTubeAuthUrl("state-123");
      assert.ok(authUrl.includes("accounts.google.com/o/oauth2/v2/auth"));
      assert.ok(authUrl.includes("youtube.upload"));
      assert.ok(authUrl.includes("youtube.readonly"));
    });

    test("should resolve correct YouTube redirect URI", () => {
      const redirectUri = getYouTubeRedirectUri();
      assert.ok(redirectUri.includes("/api/youtube/callback"));
    });

    test("should store and encrypt YouTube channel tokens securely", async () => {
      const account = await saveYouTubeAccount(testUserId, {
        channelId: "UC_TEST_CHANNEL_123",
        channelTitle: "Viral Shorts Daily",
        customUrl: "@viralshortsdaily",
        thumbnailUrl: "https://example.com/yt-thumb.jpg",
        subscriberCount: 54200,
        videoCount: 142,
        accessToken: "ya29.test_access_token_sensitive_12345",
        refreshToken: "1//04test_refresh_token_sensitive_67890",
        expiresIn: 3600,
      });

      assert.ok(account);
      assert.strictEqual(account.channel_id, "UC_TEST_CHANNEL_123");
      assert.strictEqual(account.channel_title, "Viral Shorts Daily");
      assert.notStrictEqual(account.encrypted_access_token, "ya29.test_access_token_sensitive_12345");

      const accounts = await getYouTubeAccounts(testUserId);
      assert.ok(accounts.length > 0);
      assert.strictEqual(accounts[0].channel_id, "UC_TEST_CHANNEL_123");

      // Cleanup
      await disconnectYouTubeAccount(testUserId, "UC_TEST_CHANNEL_123");
      const remaining = await getYouTubeAccounts(testUserId);
      assert.strictEqual(remaining.some((a) => a.channel_id === "UC_TEST_CHANNEL_123"), false);
    });
  });

  describe("4. Unified Multi-Platform Publishing Validation", () => {
    test("should validate Facebook immediate publishing payload", () => {
      const fbPayload = {
        video_id: "vid-123",
        platform: "facebook",
        page_id: "page-facebook-456",
        caption: "Great reel post!",
        is_test_mode: true,
      };

      const result = PublishNowSchema.safeParse(fbPayload);
      assert.strictEqual(result.success, true);
    });

    test("should validate YouTube immediate publishing payload", () => {
      const ytPayload = {
        video_id: "vid-789",
        platform: "youtube",
        youtube_channel_id: "UC_MY_CHANNEL",
        video_title: "Crazy Trickshot #Shorts",
        caption: "Check out this incredible shot! #Shorts",
        tags: ["shorts", "trickshot", "viral"],
        privacy_status: "public",
        is_short: true,
        is_test_mode: false,
      };

      const result = PublishNowSchema.safeParse(ytPayload);
      assert.strictEqual(result.success, true);
    });

    test("should reject YouTube publishing without youtube_channel_id", () => {
      const invalidYt = {
        video_id: "vid-789",
        platform: "youtube",
        caption: "Missing channel id",
      };

      const result = PublishNowSchema.safeParse(invalidYt);
      assert.strictEqual(result.success, false);
    });

    test("should validate scheduled multi-platform publishing", () => {
      const scheduledPayload = {
        video_id: "vid-scheduled-1",
        platform: "facebook",
        page_id: "page-123",
        caption: "Scheduled Reel",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        timezone: "America/New_York",
      };

      const result = SchedulePostSchema.safeParse(scheduledPayload);
      assert.strictEqual(result.success, true);
    });
  });

  describe("5. AI Viral Clip Detection & Analysis Engine", () => {
    test("parseVideoUrl correctly parses YouTube and direct video links", () => {
      const ytStandard = parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      assert.strictEqual(ytStandard.isValid, true);
      assert.strictEqual(ytStandard.type, "youtube");
      assert.strictEqual(ytStandard.videoId, "dQw4w9WgXcQ");

      const ytShort = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ");
      assert.strictEqual(ytShort.isValid, true);
      assert.strictEqual(ytShort.type, "youtube");
      assert.strictEqual(ytShort.videoId, "dQw4w9WgXcQ");

      const ytShorts = parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ");
      assert.strictEqual(ytShorts.isValid, true);
      assert.strictEqual(ytShorts.type, "youtube");
      assert.strictEqual(ytShorts.videoId, "dQw4w9WgXcQ");

      const directMp4 = parseVideoUrl("https://commondatastorage.googleapis.com/videos/sample.mp4");
      assert.strictEqual(directMp4.isValid, true);
      assert.strictEqual(directMp4.type, "direct_url");

      const invalid = parseVideoUrl("not-a-valid-url");
      assert.strictEqual(invalid.isValid, false);
      assert.ok(invalid.error);
    });

    test("formatTimestamp and parseTimestamp accurately format and parse seconds", () => {
      assert.strictEqual(formatTimestamp(36), "00:00:36");
      assert.strictEqual(formatTimestamp(252), "00:04:12");
      assert.strictEqual(formatTimestamp(3665), "01:01:05");

      assert.strictEqual(parseTimestamp("00:00:36"), 36);
      assert.strictEqual(parseTimestamp("00:04:12"), 252);
      assert.strictEqual(parseTimestamp("01:01:05"), 3665);
    });

    test("analyzeVideoViralMoments derives valid non-fabricated candidate clips with complete viral metadata", async () => {
      const sampleTranscript = [
        { start: 0, duration: 4, text: "Hey guys, today I am going to show you something crazy." },
        { start: 4, duration: 5, text: "Most people have never seen this trick before in their life!" },
        { start: 9, duration: 6, text: "Watch closely right here as I combine these two elements." },
        { start: 15, duration: 6, text: "Wait for it... look at that reaction!" },
        { start: 21, duration: 7, text: "Why did that happen? Let me explain the exact science." },
        { start: 28, duration: 8, text: "The temperature drop caused an instant pressure collapse." },
        { start: 36, duration: 6, text: "And that is why you should always double check your seals." },
        { start: 42, duration: 5, text: "Leave a comment if this surprised you, and see you next time!" },
      ];

      const analysis = await analyzeVideoViralMoments({
        videoUrl: "https://www.youtube.com/watch?v=sample123",
        sourceType: "youtube",
        videoId: "sample123",
        title: "The Ultimate Science Reaction Experiment",
        author: "Lab Creator",
        duration: 48,
        transcript: sampleTranscript,
      });

      assert.ok(analysis);
      assert.strictEqual(analysis.title, "The Ultimate Science Reaction Experiment");
      assert.strictEqual(analysis.duration, 48);
      assert.strictEqual(analysis.duration_formatted, "00:00:48");
      assert.ok(Array.isArray(analysis.candidate_clips));
      assert.ok(analysis.candidate_clips.length > 0);

      // Verify each clip meets the viral criteria
      for (const clip of analysis.candidate_clips) {
        assert.ok(clip.clip_number >= 1);
        assert.ok(clip.title.length > 0);
        assert.ok(clip.start_time >= 0, "start_time must be >= 0");
        assert.ok(clip.end_time <= 48, "end_time must be <= duration");
        assert.ok(clip.end_time > clip.start_time, "end_time must be > start_time");
        assert.ok(clip.duration >= 10 && clip.duration <= 60, "duration between 10s and 60s");
        assert.ok(clip.viral_score >= 70 && clip.viral_score <= 99, "viral_score between 70 and 99");
        assert.ok(["funny", "emotional", "educational", "surprising", "hook", "high_retention"].includes(clip.category));
        assert.ok(clip.hook.length > 0);
        assert.ok(clip.reason.length > 0);
        assert.ok(clip.caption.length > 0);
        assert.ok(Array.isArray(clip.hashtags) && clip.hashtags.length > 0);
        assert.strictEqual(clip.title_options.length, 5, "must provide 5 viral title options");
        assert.strictEqual(clip.hook_options.length, 3, "must provide 3 hook options");
        assert.strictEqual(clip.caption_options.length, 3, "must provide 3 caption options");
      }
    });

    test("renderVideoClip with subtitleStyle and hookText burns text onto vertical 9:16 video", async () => {
      const outSub = path.join(testDir, "output_viral_subtitles.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: outSub,
        startTime: 0,
        duration: 2.0,
        aspectRatio: "9:16",
        cropPosition: "center",
        subtitleStyle: "viral_bold",
        subtitleText: "WAIT FOR IT 😱",
        hookText: "THE CRAZIEST REACTION",
      });

      assert.ok(fs.existsSync(outSub));
      assert.ok(result.sizeBytes > 0);

      const probe = probeVideoFile(outSub);
      assert.strictEqual(probe.width, 1080);
      assert.strictEqual(probe.height, 1920);
      assert.strictEqual(probe.resolution, "1080x1920");
    });
  });

  describe("6. Sidebar Navigation & Coming Soon Modules", () => {
    test("verifies YouTube module is present in sidebar navigation", () => {
      const ytItem = navigationItems.find((item) => item.href === "/dashboard/youtube");
      assert.ok(ytItem, "YouTube item must exist in navigationItems");
      assert.strictEqual(ytItem.title, "YouTube");
    });

    test("verifies Facebook Pages, AI Content Studio, and AI Workflows have COMING SOON badges", () => {
      const fbItem = navigationItems.find((item) => item.href === "/dashboard/pages");
      assert.ok(fbItem);
      assert.strictEqual(fbItem.badge, "COMING SOON");

      const contentItem = navigationItems.find((item) => item.href === "/dashboard/content");
      assert.ok(contentItem);
      assert.strictEqual(contentItem.badge, "COMING SOON");

      const workflowItem = navigationItems.find((item) => item.href === "/dashboard/workflows");
      assert.ok(workflowItem);
      assert.strictEqual(workflowItem.badge, "COMING SOON");
    });
  });

  describe("7. YouTube Upload Studio & History Persistence", () => {
    test("saves and retrieves YouTube upload records", async () => {
      const uploadRecord = await saveYouTubeUploadRecord(testUserId, {
        channel_id: "UC_TEST_123",
        channel_title: "Test Gaming Channel",
        youtube_video_id: "yt_vid_abc999",
        video_url: "https://youtube.com/watch?v=yt_vid_abc999",
        title: "Incredible Gaming Moment #Shorts",
        description: "Best play of the week!",
        privacy_status: "public",
        category_id: "20",
        is_short: true,
        tags: ["gaming", "shorts", "viral"],
        status: "uploaded",
      });

      assert.ok(uploadRecord);
      assert.ok(uploadRecord.id);
      assert.strictEqual(uploadRecord.youtube_video_id, "yt_vid_abc999");
      assert.strictEqual(uploadRecord.title, "Incredible Gaming Moment #Shorts");

      const history = await getYouTubeUploadHistory(testUserId);
      assert.ok(Array.isArray(history));
      assert.ok(history.length > 0);
      assert.strictEqual(history[0].youtube_video_id, "yt_vid_abc999");

      // Delete test
      const deleted = await deleteYouTubeUploadRecord(testUserId, uploadRecord.id);
      assert.strictEqual(deleted, true);

      const afterHistory = await getYouTubeUploadHistory(testUserId);
      assert.strictEqual(afterHistory.some((h) => h.id === uploadRecord.id), false);
    });
  });

  describe("8. OpusClip AI Clipping Engine & Reframing", () => {
    test("renderVideoClip renders with OpusClip blurred backdrop vertical reframing", async () => {
      const outBlurred = path.join(testDir, "output_blurred_backdrop.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: outBlurred,
        startTime: 0,
        duration: 2.0,
        aspectRatio: "9:16",
        reframingMode: "blurred_backdrop",
        subtitleStyle: "hormozi",
        subtitleText: "ALEX HORMOZI STYLE CAPTION",
        hookText: "WAIT TILL THE END 🔥",
        watermarkText: "PagePulse AI",
        watermarkPosition: "top_right",
        watermarkOpacity: 0.8,
      });

      assert.ok(fs.existsSync(outBlurred));
      assert.ok(result.sizeBytes > 0);
      assert.strictEqual(result.duration, 2.0);

      const probe = probeVideoFile(outBlurred);
      assert.strictEqual(probe.width, 1080);
      assert.strictEqual(probe.height, 1920);
      assert.strictEqual(probe.resolution, "1080x1920");
    });

    test("renderVideoClip renders with split-screen vertical reframing", async () => {
      const outSplit = path.join(testDir, "output_split_screen.mp4");
      const result = await renderVideoClip({
        inputPath: testVideoPath,
        outputPath: outSplit,
        startTime: 0.5,
        duration: 1.5,
        aspectRatio: "9:16",
        reframingMode: "split_screen",
        subtitleStyle: "karaoke",
        subtitleText: "KARAOKE GLOWING SUBTITLES",
      });

      assert.ok(fs.existsSync(outSplit));
      assert.ok(result.sizeBytes > 0);

      const probe = probeVideoFile(outSplit);
      assert.strictEqual(probe.width, 1080);
      assert.strictEqual(probe.height, 1920);
    });

    test("analyzeVideoViralMoments supports custom clip counts and duration presets", async () => {
      const sampleTranscript = [
        { start: 0, duration: 4, text: "Welcome back guys, today we are discussing the number one mistake beginners make." },
        { start: 4, duration: 5, text: "Most people spend months building products without talking to a single customer." },
        { start: 9, duration: 4, text: "This is completely crazy because you need to validate demand first!" },
        { start: 13, duration: 5, text: "So here is the three-step framework that will save you hundreds of hours." },
        { start: 18, duration: 6, text: "Step one: find ten people in your target niche and ask them about their biggest pain point." },
        { start: 24, duration: 5, text: "Step two: pre-sell your solution before writing a single line of code." },
        { start: 29, duration: 5, text: "And step three: deliver massive value and get them to refer two friends." },
        { start: 34, duration: 5, text: "If you do this, you will never waste time again! Hit subscribe for more tips." },
      ];

      const analysis = await analyzeVideoViralMoments({
        videoUrl: "https://example.com/podcast.mp4",
        sourceType: "direct_url",
        title: "The Ultimate Guide to Startup Validation",
        duration: 40,
        transcript: sampleTranscript,
        userId: testUserId,
        clipCount: 3,
        durationPreset: "30-60",
        targetPlatform: "both",
        aiInstructions: "Find the strongest advice moment for beginners",
      });

      assert.ok(analysis);
      assert.strictEqual(analysis.transcript_available, true);
      assert.ok(Array.isArray(analysis.candidate_clips));
      assert.ok(analysis.candidate_clips.length > 0);

      const clip = analysis.candidate_clips[0];
      assert.ok(clip.viral_score >= 70 && clip.viral_score <= 100);
      assert.ok(clip.virality_breakdown);
      assert.ok(clip.virality_breakdown.hook > 0);
      assert.ok(clip.virality_breakdown.emotional > 0);
      assert.ok(clip.virality_breakdown.value > 0);
      assert.ok(clip.virality_breakdown.retention > 0);
      assert.ok(clip.virality_breakdown.quality > 0);
      assert.ok(clip.title_options.length >= 3);
      assert.ok(clip.hook_options.length >= 2);
      assert.ok(clip.reason.length > 10);
    });

    test("searchTranscriptForTopic finds matching timestamped moment by topic query", async () => {
      const sampleTranscript = [
        { start: 0, duration: 5, text: "Hello everyone, today we talk about digital marketing." },
        { start: 10, duration: 6, text: "Now let's talk about the biggest mistake beginners make in business." },
        { start: 16, duration: 5, text: "Beginners always underprice their services out of fear." },
        { start: 21, duration: 6, text: "When you charge premium prices, customers take you seriously and value your work." },
        { start: 27, duration: 5, text: "That is why you must double your prices today." },
      ];

      const matchedClip = await searchTranscriptForTopic({
        topicQuery: "biggest mistake beginners make",
        transcript: sampleTranscript,
        videoDuration: 35,
        videoTitle: "Marketing Masterclass",
        userId: testUserId,
      });

      assert.ok(matchedClip);
      assert.ok(matchedClip.start_time >= 8 && matchedClip.start_time <= 15);
      assert.ok(matchedClip.end_time > matchedClip.start_time);
      assert.ok(matchedClip.viral_score >= 80);
      assert.strictEqual(matchedClip.category, "educational");
    });
  });

  describe("9. Production Render Storage, Job System & Temporary File Management", () => {
    test("getRenderBaseDir always resolves to os.tmpdir() and never project root or /var/task", () => {
      const baseDir = getRenderBaseDir();
      assert.ok(baseDir.startsWith(os.tmpdir()));
      assert.strictEqual(baseDir.includes("/var/task"), false);
      assert.ok(fs.existsSync(baseDir));
    });

    test("createJobTempDir creates an isolated writable folder and cleanupJobTempDir cleans it up", async () => {
      const testJobId = "job_test_" + Date.now();
      const jobDir = createJobTempDir(testJobId);
      assert.ok(fs.existsSync(jobDir));

      // Write test intermediate file
      const testFile = path.join(jobDir, "interm.txt");
      fs.writeFileSync(testFile, "intermediate render data");
      assert.ok(fs.existsSync(testFile));

      // Cleanup
      await cleanupJobTempDir(jobDir);
      assert.strictEqual(fs.existsSync(jobDir), false);
    });

    test("sanitizeErrorMessage scrubs internal server paths and /var/task", () => {
      const raw = "ENOENT: no such file or directory, mkdir '/var/task/.data/renders'";
      const scrubbed = sanitizeErrorMessage(raw);
      assert.strictEqual(scrubbed.includes("/var/task"), false);
      assert.strictEqual(scrubbed.includes("ENOENT"), false);
      assert.ok(scrubbed.length > 5);
    });

    test("createClipRenderJob and updateClipRenderJob persist lifecycle states cleanly", async () => {
      const job = await createClipRenderJob({
        user_id: testUserId,
        source_video_url: testVideoPath,
        clip_title: "Test Viral Short",
        start_time: 0,
        end_time: 3,
        duration: 3,
        aspect_ratio: "9:16",
        reframing_mode: "blurred_backdrop",
        subtitle_style: "hormozi",
      });

      assert.ok(job);
      assert.ok(job.id);
      assert.strictEqual(job.status, "queued");
      assert.strictEqual(job.progress, 0);

      // Transition to rendering
      const inProgress = await updateClipRenderJob(job.id, testUserId, {
        status: "rendering",
        progress: 60,
      });
      assert.strictEqual(inProgress?.status, "rendering");
      assert.strictEqual(inProgress?.progress, 60);

      // Verify retrieval
      const fetched = await getClipRenderJob(job.id, testUserId);
      assert.strictEqual(fetched?.id, job.id);
      assert.strictEqual(fetched?.status, "rendering");

      // Cancel
      const cancelled = await cancelClipRenderJob(job.id, testUserId);
      assert.strictEqual(cancelled, true);

      const afterCancel = await getClipRenderJob(job.id, testUserId);
      assert.strictEqual(afterCancel?.status, "cancelled");
    });

    test("executeRenderJob processes complete pipeline, creates output MP4, and cleans up temp directory", async () => {
      const job = await createClipRenderJob({
        user_id: testUserId,
        source_video_url: testVideoPath,
        clip_title: "Full Pipeline Render",
        start_time: 0.5,
        end_time: 2.5,
        duration: 2.0,
        aspect_ratio: "9:16",
        reframing_mode: "blurred_backdrop",
        subtitle_style: "hormozi",
        subtitle_text: "PRODUCTION RENDER VERIFIED",
        hook_text: "WAIT TILL THE END 🔥",
      });

      const result = await executeRenderJob(job);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.job.status, "completed");
      assert.strictEqual(result.job.progress, 100);
      assert.ok(result.job.exported_url);
      assert.ok(result.job.file_size && result.job.file_size > 0);

      // Verify temporary directory was cleaned up
      const jobDir = path.join(getRenderBaseDir(), job.id);
      assert.strictEqual(fs.existsSync(jobDir), false, "Temporary job directory must be deleted after render");
    });
  });
});
