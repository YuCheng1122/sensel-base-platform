import type { ReactNode } from "react";
import "@sensel/ui/styles.css";
export const metadata = {
  title: "SenseL Base",
  description: "An extensible analysis workspace",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
