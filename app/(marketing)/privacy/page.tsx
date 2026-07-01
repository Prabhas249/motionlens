import type { Metadata } from "next";
import { PageShell, Section } from "@marketing/components/page-shell";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "How MotionLens handles your data.",
};

export default function PrivacyPage() {
    return (
        <PageShell
            eyebrow="Legal"
            title="Privacy Policy"
            intro="A plain-English summary of what we collect and why. Questions? support@motionlens.dev."
        >
            <Section title="What we collect">
                <p>
                    Your account details (name and email via Google sign-in), the clips and URLs
                    you submit for analysis, the Motion Blueprints we generate, and basic usage and
                    billing records.
                </p>
            </Section>
            <Section title="How we use it">
                <p>
                    To run analyses, deliver and improve the product, meter credits, provide
                    support, and keep the service secure. We do not sell your personal data.
                </p>
            </Section>
            <Section title="Uploaded clips">
                <p>
                    Clips are processed to produce a Blueprint. They are stored only as long as
                    needed to deliver and let you re-open your analyses, and you can delete your
                    account and associated data at any time from Settings.
                </p>
            </Section>
            <Section title="Subprocessors">
                <p>
                    We use trusted providers to run MotionLens — including Google (Gemini analysis
                    and auth), Supabase (database and storage), Vercel (hosting), and our payments
                    processor. Each handles data under its own terms.
                </p>
            </Section>
            <Section title="Your rights">
                <p>
                    You can access, export, or delete your data. Email{" "}
                    <a
                        href="mailto:support@motionlens.dev"
                        className="font-medium text-[#2A48F0] hover:underline"
                    >
                        support@motionlens.dev
                    </a>{" "}
                    and we&apos;ll help.
                </p>
            </Section>
        </PageShell>
    );
}
