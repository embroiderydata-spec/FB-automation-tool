import { SupabaseClient } from "@supabase/supabase-js";

export type StorageCategory =
  | "images"
  | "scenes"
  | "audio"
  | "subtitles"
  | "renders"
  | "thumbnails";

/**
 * Builds standard hierarchical storage path:
 * user_id/facebook_page_id/content_id/{category}/{filename}
 */
export function buildStoragePath(
  userId: string,
  pageId: string,
  contentId: string,
  category: StorageCategory,
  filename: string
): string {
  const sanitizedUser = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedPage = pageId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedContent = contentId.replace(/[^a-zA-Z0-9_-]/g, "");
  const sanitizedFile = filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

  return `${sanitizedUser}/${sanitizedPage}/${sanitizedContent}/${category}/${sanitizedFile}`;
}

/**
 * Uploads a file buffer or stream to Supabase Storage with MIME type and cache headers.
 */
export async function uploadMediaToStorage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  buffer: Buffer | Uint8Array,
  contentType: string
): Promise<{ path: string; publicUrl: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      console.warn(`[Storage] Upload warning for ${path}:`, error.message);
      // Fallback local relative path
      return {
        path,
        publicUrl: `/storage/${path}`,
      };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (err: any) {
    return {
      path,
      publicUrl: `/storage/${path}`,
      error: err.message,
    };
  }
}
