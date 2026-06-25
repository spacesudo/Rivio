import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Rivio",
  description: "Finance at the speed of now.",
  icons: {
    icon: "/rivio.png",
    apple: "/rivio.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ThemeProvider>
          <div className="app-bg relative mx-auto min-h-screen w-full max-w-shell overflow-hidden">
            <ToastProvider>{children}</ToastProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
