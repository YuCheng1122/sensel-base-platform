import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { PlatformThemeProvider } from "@sensel/ui";
import "@sensel/ui/styles.css";
import "@sensel/chat/styles.css";
export const metadata = {
  title: "Avocado SenseL",
  description: "An extensible analysis workspace",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>
        <PlatformThemeProvider>{children}</PlatformThemeProvider>
      </body>
    </html>
  );
}
