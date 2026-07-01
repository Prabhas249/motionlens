import ffmpegStatic from "ffmpeg-static";

// Bundled ffmpeg binary (has libx264). ffmpeg-static resolves the right binary
// on Vercel's serverless runtime, which otherwise has no ffmpeg at all. Falls
// back to PATH for local dev where a system ffmpeg is usually installed.
export const FFMPEG: string = (ffmpegStatic as unknown as string) || "ffmpeg";
