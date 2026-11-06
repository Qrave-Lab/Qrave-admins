import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import FeedbackHost from "@/components/ui/FeedbackHost";
import A11yEnhancer from "@/components/ui/A11yEnhancer";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Qrave Superadmin", template: "%s · Qrave Superadmin" },
  description: "Global admin console for Qrave",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <FeedbackHost />
        <A11yEnhancer />
      </body>
    </html>
  );
}
