import type { Metadata } from "next";
import { PageShell, Section } from "@marketing/components/page-shell";

export const metadata: Metadata = {
    title: "Terms of Use",
    description: "The terms for using MotionLens.",
};

export default function TermsPage() {
    return (
        <PageShell
            eyebrow="Legal"
            title="Terms of Use"
            intro="By using MotionLens you agree to these terms. Questions? support@motionlens.dev."
        >
            <Section title="The service">
                <p>
                    MotionLens analyzes UI-animation clips and URLs and returns Motion Blueprints
                    and sample code. Output is a best-effort description to help your AI agent
                    recreate motion — it gets you most of the way there, not a pixel-perfect clone.
                    You&apos;re responsible for reviewing generated code before shipping it.
                </p>
            </Section>
            <Section title="Your content">
                <p>
                    You keep ownership of the clips you upload and confirm you have the right to
                    submit them. You grant us the limited right to process them to deliver the
                    service. Don&apos;t upload content you don&apos;t have rights to.
                </p>
            </Section>
            <Section title="Acceptable use">
                <p>
                    Don&apos;t abuse, reverse-engineer, resell, or overload the service, and
                    don&apos;t use it for anything unlawful. We may suspend accounts that do.
                </p>
            </Section>
            <Section title="Credits & billing">
                <p>
                    Paid plans are billed in advance and renew until cancelled. Analyses consume
                    credits by mode; failed analyses are refunded in credits. Prices may change
                    with notice.
                </p>
            </Section>
            <Section title="Disclaimer">
                <p>
                    The service is provided &quot;as is&quot; without warranties. To the extent
                    permitted by law, MotionLens is not liable for indirect or consequential
                    damages arising from your use of the product or its output.
                </p>
            </Section>
        </PageShell>
    );
}
