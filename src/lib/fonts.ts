import { Space_Mono, Playfair_Display } from "next/font/google";

/**
 * Body font — matches Crypto Graveyard's body:
 *   'Space Mono', 'Courier Prime', monospace
 */
export const bodyFont = Space_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

/**
 * Display / hero font — matches Crypto Graveyard's hero title:
 *   'Playfair Display', Georgia, serif
 */
export const displayFont = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});
