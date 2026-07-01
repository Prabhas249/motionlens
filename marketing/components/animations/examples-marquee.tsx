/* eslint-disable @next/next/no-img-element */
import { Marquee } from "@marketing/components/ui/marquee";
import { cn } from "@marketing/lib/utils";

export interface ExampleClip {
    id: string;
    title: string;
    tag: string;
    credit: string;
    poster: string;
    video?: string;
}

export const ExampleCard = ({ title, tag, credit, poster, video }: ExampleClip) => (
    <figure
        className={cn(
            "group relative flex w-[260px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl sm:w-[300px]",
            "border border-border bg-card",
            "shadow-[0px_0px_0px_1px_rgba(0,0,0,0.04),0px_8px_12px_-4px_rgba(15,12,12,0.08),0px_1px_2px_0px_rgba(15,12,12,0.10)]",
        )}
    >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
            {video ? (
                <video
                    className="h-full w-full object-cover"
                    src={video}
                    poster={poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                />
            ) : (
                <img
                    src={poster}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
            )}

            {/* framework tag */}
            <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                {tag}
            </span>
        </div>

        <figcaption className="flex flex-col gap-1 px-4 py-3.5">
            <p className="select-none text-sm font-medium leading-snug text-foreground">
                {title}
            </p>
            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{credit}</span>
                <span className="shrink-0 text-xs font-medium text-[#2A48F0] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Recreate &rarr;
                </span>
            </div>
        </figcaption>
    </figure>
);

export function ExamplesMarquee({ examples }: { examples: ExampleClip[] }) {
    const firstRow = examples.slice(0, Math.ceil(examples.length / 2));
    const secondRow = examples.slice(Math.ceil(examples.length / 2));

    return (
        <div className="relative w-full overflow-hidden py-8">
            <div className="flex flex-col gap-4">
                <Marquee className="[--duration:55s]" pauseOnHover>
                    {firstRow.map((clip) => (
                        <ExampleCard {...clip} key={clip.id} />
                    ))}
                </Marquee>
                <Marquee className="[--duration:55s]" reverse pauseOnHover>
                    {secondRow.map((clip) => (
                        <ExampleCard {...clip} key={clip.id} />
                    ))}
                </Marquee>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/12 bg-linear-to-r from-background"></div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/12 bg-linear-to-l from-background"></div>
        </div>
    );
}
