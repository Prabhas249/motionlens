"use client";

import { Search, FolderGit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@marketing/lib/utils";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";

// lucide-react v1 removed brand glyphs, so ship the GitHub mark inline.
const Github = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.25.82-.57 0-.28-.01-1.02-.02-2-3.34.71-4.04-1.58-4.04-1.58-.55-1.36-1.34-1.73-1.34-1.73-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.81 0-1.28.47-2.33 1.23-3.15-.12-.3-.53-1.51.12-3.15 0 0 1-.32 3.3 1.2a11.6 11.6 0 016 0c2.3-1.52 3.29-1.2 3.29-1.2.65 1.64.24 2.85.12 3.15.77.82 1.23 1.87 1.23 3.15 0 4.51-2.81 5.5-5.49 5.79.43.36.81 1.09.81 2.2 0 1.59-.01 2.87-.01 3.26 0 .32.21.69.83.57A12.01 12.01 0 0024 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
);

const MotionLensChip = ({ className }: { className?: string }) => (
    <span className={cn("flex items-center justify-center rounded-md bg-[#2A48F0] text-white", className)}>
        <MotionLensLogo className="size-4" animated={false} />
    </span>
);

const integrations = [
    { name: "MotionLens", icon: MotionLensChip, installed: true, visible: true },
    { name: "Filesystem", icon: FolderGit2, installed: false, visible: true },
    { name: "GitHub", icon: Github, installed: false, visible: true },
];

export function IntegrationsPopover({ open, position = "bottom" }: { open: boolean; position?: "top" | "bottom" }) {
    const positionClasses = position === "top"
        ? "bottom-full mb-2"
        : "top-full mt-2";

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0, y: position === "top" ? 10 : -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: position === "top" ? 10 : -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute ${positionClasses} left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 overflow-hidden rounded-3xl w-[280px] md:w-[350px] bg-linear-to-b from-[#E5E7EB] dark:from-[#27272A] to-[#E5E7EB]/40 dark:to-[#27272A]/40 text-secondary-foreground text-sm font-medium backdrop-blur-xl backdrop-saturate-150 shadow-badge z-50`}
                >
                    <div className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search MCP servers"
                                className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground pointer-events-none h-14"
                            />
                        </div>
                        {integrations.map((integration) => {
                            const Icon = integration.icon;
                            return (
                                <div
                                    key={integration.name}
                                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer last:border-b-0 ${!integration.visible ? "hidden md:flex" : ""}`}
                                >
                                    <div
                                        className="size-8 flex items-center justify-center shrink-0"
                                    >
                                        <Icon
                                            className="size-6"
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-foreground flex-1">
                                        {integration.name}
                                    </span>
                                    {integration.installed && (
                                        <span className="text-xs text-[#2A48F0] font-medium bg-[#2A48F0]/10 rounded-lg px-2 py-1">
                                            Connected
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

