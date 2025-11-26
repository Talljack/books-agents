import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/blocks/header";
import { Footer } from "@/components/blocks/footer";

export const metadata: Metadata = {
  title: {
    default: "BookFinder AI - Discover Your Next Great Read",
    template: "%s | BookFinder AI",
  },
  description:
    "AI-powered book discovery platform. Search millions of books, get AI analysis, and find books that match your interests.",
  keywords: ["books", "book search", "AI", "reading", "book recommendations", "book discovery"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
