import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@marketing/components/section/footer";

export function PageShell({
    eyebrow,
    title,
    intro,
    children,
}: {
    eyebrow?: string;
    title: string;
    intro?: string;
    children: React.ReactNode;
}) {
    return (
        <main className="flex w-full flex-col pt-16">
            <div className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" /> Back to home
                </Link>
                {eyebrow && (
                    <p className="mb-3 font-mono text-xs uppercase tracking-wide text-[#2A48F0]">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-balance text-3xl font-semibold tracking-tighter text-foreground md:text-4xl">
                    {title}
                </h1>
                {intro && (
                    <p className="mt-4 text-balance text-lg text-muted-foreground">
                        {intro}
                    </p>
                )}
                <div className="prose-page mt-12 flex flex-col gap-10">{children}</div>
            </div>
            <div className="border-t border-border">
                <Footer />
            </div>
        </main>
    );
}

export function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {title}
            </h2>
            <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
    return (
        <PageShell eyebrow="Coming soon" title={title} intro={blurb}>
            <Section title="Not live yet">
                <p>
                    We&apos;re building this out. In the meantime, jump into the product
                    or reach us at{" "}
                    <a
                        href="mailto:support@motionlens.dev"
                        className="font-medium text-[#2A48F0] hover:underline"
                    >
                        support@motionlens.dev
                    </a>
                    .
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                    <Link
                        href="/login"
                        className="inline-flex h-10 items-center rounded-lg bg-[#2A48F0] px-4 text-sm font-medium text-white transition hover:bg-[#2138c9]"
                    >
                        Start for free
                    </Link>
                    <Link
                        href="/docs"
                        className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-accent"
                    >
                        Read the docs
                    </Link>
                </div>
            </Section>
        </PageShell>
    );
}
