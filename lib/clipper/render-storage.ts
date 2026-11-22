import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Returns the base temporary directory for PagePulse video rendering.
 * Always resolves to a writable OS temporary path (e.g. /tmp on Linux/Vercel).
 * NEVER returns /var/task or project root.
 */
export function getRenderBaseDir(): string {
  const baseDir = path.join(os.tmpdir(), "pagepulse-renders");
  if (!fs.existsSync(baseDir)) {
    try {
      fs.mkdirSync(baseDir, { recursive: true });
    } catch (err: any) {
      console.warn("[RenderStorage] Could not create base render dir:", err.message);
    }
  }
  return baseDir;
}

/**
 * Creates an isolated, unique temporary directory for a specific render job.
 */
export function createJobTempDir(jobId: string): string {
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
  const jobDir = path.join(getRenderBaseDir(), safeId);
  if (!fs.existsSync(jobDir)) {
    fs.mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
}

/**
 * Safely cleans up and deletes all temporary files in a job directory.
 */
export async function cleanupJobTempDir(jobIdOrPath: string): Promise<void> {
  try {
    let targetPath = jobIdOrPath;
    if (!path.isAbsolute(jobIdOrPath)) {
      targetPath = path.join(getRenderBaseDir(), jobIdOrPath.replace(/[^a-zA-Z0-9_-]/g, ""));
    }

    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  } catch (err: any) {
    console.warn(`[RenderStorage] Safe cleanup warning for ${jobIdOrPath}:`, err.message);
  }
}

/**
 * Cleans up abandoned render directories older than maxAgeMs (default: 1 hour).
 */
export async function cleanAbandonedTempDirs(maxAgeMs: number = 3600000): Promise<void> {
  try {
    const baseDir = getRenderBaseDir();
    if (!fs.existsSync(baseDir)) return;

    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        try {
          const stats = fs.statSync(dirPath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        } catch {}
      }
    }
  } catch (err: any) {
    console.warn("[RenderStorage] Abandoned temp cleanup warning:", err.message);
  }
}

/**
 * Downloads a remote video into a target temporary file with timeout and size check.
 */
export async function downloadSourceVideo(
  url: string,
  targetPath: string,
  timeoutMs: number = 60000
): Promise<string> {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "PagePulseAI/2.8 (+https://fb-automation-tool-seven.vercel.app)",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Source video download failed with status ${res.status}: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Downloaded source video file is empty (0 bytes).");
    }

    fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    return targetPath;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Scrubs raw server filesystem paths from error messages so customers never see internal server details.
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  if (!rawMessage) return "An unexpected error occurred during video rendering.";
  return rawMessage
    .replace(/\/var\/task[^\s:]*/gi, "[server-task]")
    .replace(/[a-zA-Z]:\\[^\s:]*/gi, "[server-path]")
    .replace(/\/tmp\/[^\s:]*/gi, "[temp-storage]")
    .replace(/ENOENT: no such file or directory/gi, "Temporary file system resource unavailable")
    .replace(/spawn\s+[^\s]+\s+ENOENT/gi, "Rendering binary could not be started");
}
