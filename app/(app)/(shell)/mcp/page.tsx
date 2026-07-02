import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { McpView } from "@/components/mcp-view";

export const metadata = { title: "MCP · MotionLens" };

export default async function McpPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return <McpView />;
}
