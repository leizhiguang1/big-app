import type { ReactNode } from "react";

export const metadata = {
  title: "aim-app",
  description: "GoHighLevel-style funnels and marketing CRM (scaffold)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
