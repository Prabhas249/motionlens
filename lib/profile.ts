import { createClient } from "@/lib/supabase/server";

export type Profile = {
  userId: string;
  email: string;
  name: string; // best display name (override → Google → email)
  displayName: string | null; // the user's explicit override, if any
  avatar: string;
  credits: number;
  plan: string;
  settings: Record<string, unknown>;
};

// Server-side: merges the auth user (email, Google name/avatar) with the
// profiles row (credits, plan, display_name, settings). Returns null if signed out.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("credits, plan, display_name, settings")
    .eq("id", user.id)
    .single();

  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const googleName = meta.full_name || meta.name || "";

  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: (data?.display_name as string) ?? null,
    name:
      (data?.display_name as string) ||
      googleName ||
      user.email?.split("@")[0] ||
      "Account",
    avatar: meta.avatar_url || meta.picture || "",
    credits: (data?.credits as number) ?? 0,
    plan: (data?.plan as string) ?? "free",
    settings: (data?.settings as Record<string, unknown>) ?? {},
  };
}
