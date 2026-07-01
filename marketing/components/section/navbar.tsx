"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { siteConfig } from "@marketing/lib/config";
import { ThemeToggle } from "@marketing/components/theme-toggle";
import PremiumButton from "@marketing/components/premium-button";
import { MotionLensLogo } from "@marketing/components/motionlens-logo";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    NavigationMenuViewport,
} from "@marketing/components/ui/navigation-menu";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@marketing/components/ui/accordion";

function BrandLockup() {
    return (
        <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#2A48F0] text-white shadow-sm">
                <MotionLensLogo className="size-[18px]" animated={false} />
            </span>
            <span className="font-mono text-base font-semibold lowercase tracking-tight text-foreground">
                motionlens
            </span>
        </Link>
    );
}

function HamburgerButton({
    isOpen,
    onClick,
}: {
    isOpen: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="relative z-50 flex size-8 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent md:hidden"
            aria-label="Toggle menu"
        >
            <div className="relative flex size-5 items-center justify-center">
                <motion.span
                    className="absolute h-0.5 w-4 bg-foreground"
                    initial={false}
                    animate={isOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -4 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                />
                <motion.span
                    className="absolute h-0.5 w-4 bg-foreground"
                    initial={false}
                    animate={isOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 4 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                />
            </div>
        </button>
    );
}

function DesktopNav() {
    return (
        <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="gap-1">
                {siteConfig.nav.links.map((link) => (
                    <NavigationMenuItem key={link.id}>
                        {link.submenu ? (
                            <>
                                <NavigationMenuTrigger className="h-8 w-fit rounded-full border border-transparent bg-transparent px-2 pl-3 text-foreground data-[state=open]:border-border data-[state=open]:bg-accent/50">
                                    {link.name}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent className="p-0!">
                                    <div className="flex flex-col">
                                        <div className="grid w-[1100px] grid-cols-3 gap-2 p-2">
                                            {link.submenu.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex flex-col gap-4 rounded-2xl border bg-muted p-4 transition-colors hover:bg-accent/50"
                                                >
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
                                                        {item.icon}
                                                    </div>
                                                    <div className="space-y-3">
                                                        <h3 className="text-xl font-semibold">
                                                            {item.name}
                                                        </h3>
                                                        <p className="text-base leading-relaxed text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                    {item.image && (
                                                        <div className="flex-1 rounded-xl border bg-card p-5">
                                                            <div className="relative h-full min-h-[200px] w-full overflow-hidden rounded-md">
                                                                <Image
                                                                    src={item.image.trim()}
                                                                    alt={item.name}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </NavigationMenuContent>
                            </>
                        ) : (
                            <NavigationMenuLink
                                asChild
                                className="h-8 w-fit rounded-full border border-transparent bg-transparent px-2 text-foreground hover:border-border"
                            >
                                <Link
                                    href={link.href}
                                    className="group inline-flex h-8 w-fit items-center justify-center rounded-full bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                                >
                                    {link.name}
                                </Link>
                            </NavigationMenuLink>
                        )}
                    </NavigationMenuItem>
                ))}
            </NavigationMenuList>
            <NavigationMenuViewport className="border border-border shadow-2xl" />
        </NavigationMenu>
    );
}

function MobileNav({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const goToLogin = () => {
        onClose();
        window.location.href = siteConfig.loginUrl;
    };
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
                        style={{ top: "64px" }}
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 right-0 bottom-0 left-0 z-50 w-full overflow-y-auto bg-background shadow-2xl md:hidden"
                    >
                        <div className="flex h-full flex-col">
                            <nav className="flex-1 px-6 py-8 pb-32">
                                <div className="grid grid-cols-1 gap-4">
                                    {siteConfig.nav.links.map((link, index) => (
                                        <motion.div
                                            key={link.id}
                                            initial={{
                                                opacity: 0,
                                                y: -30,
                                                filter: "blur(10px)",
                                                clipPath: "inset(100% 0% 0% 0%)",
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                filter: "blur(0px)",
                                                clipPath: "inset(0% 0% 0% 0%)",
                                            }}
                                            transition={{
                                                delay: index * 0.1,
                                                duration: 0.6,
                                                ease: [0.16, 1, 0.3, 1],
                                            }}
                                        >
                                            {link.submenu ? (
                                                <Accordion type="single" collapsible className="w-full">
                                                    <AccordionItem
                                                        value={`item-${link.id}`}
                                                        className="border-none"
                                                    >
                                                        <AccordionTrigger className="px-0 py-3 text-xl font-medium uppercase hover:no-underline">
                                                            {link.name}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="overflow-hidden text-sm data-[state=closed]:animate-none! data-[state=open]:animate-none!">
                                                            <ul className="grid grid-cols-1 gap-6 overflow-hidden pt-4">
                                                                {link.submenu.map((item) => (
                                                                    <li key={item.id}>
                                                                        <Link
                                                                            href={item.href}
                                                                            onClick={onClose}
                                                                            className="flex items-start gap-3 transition-colors"
                                                                        >
                                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                                                                                {item.icon}
                                                                            </div>
                                                                            <div className="flex-1 space-y-1">
                                                                                <h3 className="text-sm font-medium text-foreground">
                                                                                    {item.name}
                                                                                </h3>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {item.description}
                                                                                </p>
                                                                            </div>
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                </Accordion>
                                            ) : (
                                                <Link
                                                    href={link.href}
                                                    onClick={onClose}
                                                    className="block px-0 py-3 text-xl font-medium uppercase transition-colors hover:text-accent-foreground"
                                                >
                                                    {link.name}
                                                </Link>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </nav>
                            <div className="sticky bottom-0 w-full border-t border-border bg-background p-6">
                                <PremiumButton text={siteConfig.cta} onClick={goToLogin} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export function Navbar() {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const goToLogin = () => {
        window.location.href = siteConfig.loginUrl;
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < 10) {
                setIsVisible(true);
            } else if (currentScrollY > lastScrollY) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY) {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [lastScrollY]);

    useEffect(() => {
        document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isMobileMenuOpen]);

    return (
        <motion.header
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 right-0 left-0 z-50 border-b bg-background"
        >
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                <BrandLockup />

                <DesktopNav />

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <div className="hidden md:block">
                        <PremiumButton text={siteConfig.cta} onClick={goToLogin} />
                    </div>
                    <HamburgerButton
                        isOpen={isMobileMenuOpen}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    />
                </div>
            </div>

            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
        </motion.header>
    );
}
