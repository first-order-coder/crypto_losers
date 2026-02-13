import type { Metadata } from "next";
import { bodyFont, displayFont } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Losers",
  description: "Track your worst-performing crypto trades",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="font-sans bg-white text-foreground antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
