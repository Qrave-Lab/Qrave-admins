import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qrave Superadmin",
  description: "Global admin console for Qrave",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem('qrave.sa.theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var nextTheme = theme === 'dark' || theme === 'light' ? theme : (prefersDark ? 'dark' : 'light');
                  document.documentElement.classList.toggle('dark', nextTheme === 'dark');
                  document.documentElement.style.colorScheme = nextTheme;
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
