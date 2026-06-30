import "../globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// The product (dashboard / auth). next-themes drives the `.dark` class on
// <html>; dark is the brand default, but the theme toggle switches to the
// branded light palette. globals.css only loads on these routes. The Geist
// font is inherited from the root <html> so portaled menus/dialogs match too.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="motionlens-app-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
