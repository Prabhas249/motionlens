import "../globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

// The product (dashboard / auth). next-themes drives the `.dark` class on
// <html>; dark is the brand default, but the theme toggle switches to the
// branded light palette. globals.css only loads on these routes.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="motionlens-app-theme"
      disableTransitionOnChange
    >
      <div className={cn("font-sans", geist.variable)}>{children}</div>
    </ThemeProvider>
  );
}
