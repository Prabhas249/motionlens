import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { NotificationsForm } from "@/components/settings/notifications-form";

export const metadata = { title: "Notifications · Settings" };

export default async function NotificationsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return <NotificationsForm settings={profile.settings} />;
}
