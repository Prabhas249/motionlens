import { createClient as createAdmin } from "@supabase/supabase-js";
import { presignGet } from "@/lib/r2";

// Data layer for the public gallery (/animations). Reads ONLY rows the
// curation flow marked public=true — user runs are private by default.
// Pages using this are ISR'd (revalidate 1800s) while presigned media URLs
// live 7200s, so a cached page never ships an expired URL.

export type ShowcaseMotion = {
  element?: string;
  change?: string;
  motion_class?: string;
  from?: string;
  to?: string;
  duration_ms?: number;
  easing?: string;
  confidence?: string;
};

export type ShowcaseBlueprint = {
  summary?: string;
  story?: string;
  beats?: string[];
  motion?: ShowcaseMotion[];
  feel?: string[];
  blind_spots?: string[];
};

export type Showcase = {
  id: string;
  slug: string;
  title: string;
  mode: string;
  pattern_tags: string[];
  blueprint: ShowcaseBlueprint;
  created_at: string;
  clipUrl: string | null;
  framesUrl: string | null;
};

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const MEDIA_TTL = 7200; // s — must outlive the page's ISR window

export async function listShowcases(): Promise<Showcase[]> {
  const { data } = await admin()
    .from("analyses")
    .select("id, slug, title, mode, pattern_tags, blueprint, created_at, clip_key, frames_key")
    .eq("public", true)
    .not("slug", "is", null)
    .order("created_at", { ascending: false });
  return Promise.all((data ?? []).map(toShowcase));
}

export async function getShowcase(slug: string): Promise<Showcase | null> {
  const { data } = await admin()
    .from("analyses")
    .select("id, slug, title, mode, pattern_tags, blueprint, created_at, clip_key, frames_key")
    .eq("public", true)
    .eq("slug", slug)
    .maybeSingle();
  return data ? toShowcase(data) : null;
}

export async function listShowcaseSlugs(): Promise<string[]> {
  const { data } = await admin()
    .from("analyses")
    .select("slug")
    .eq("public", true)
    .not("slug", "is", null);
  return (data ?? []).map((r) => r.slug as string);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function toShowcase(row: any): Promise<Showcase> {
  let clipUrl: string | null = null;
  let framesUrl: string | null = null;
  try {
    if (row.clip_key) clipUrl = await presignGet(row.clip_key, MEDIA_TTL);
    if (row.frames_key) framesUrl = await presignGet(row.frames_key, MEDIA_TTL);
  } catch {
    /* media gone — page still renders the blueprint */
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? "Untitled analysis",
    mode: row.mode,
    pattern_tags: row.pattern_tags ?? [],
    blueprint: (row.blueprint ?? {}) as ShowcaseBlueprint,
    created_at: row.created_at,
    clipUrl,
    framesUrl,
  };
}
