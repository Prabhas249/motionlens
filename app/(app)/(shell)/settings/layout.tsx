import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, plan, and notification preferences.
          </p>
        </header>
        <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
