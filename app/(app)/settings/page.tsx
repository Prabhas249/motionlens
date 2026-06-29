import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { AccountForm } from "@/components/settings/account-form";
import { DangerZone } from "@/components/settings/danger-zone";

export const metadata = { title: "Account · Settings" };

export default async function AccountSettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-6">
      <AccountForm
        email={profile.email}
        avatar={profile.avatar}
        name={profile.name}
        displayName={profile.displayName}
      />
      <DangerZone />
    </div>
  );
}
