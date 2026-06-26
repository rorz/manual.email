import type { Metadata } from "next";
import { Geist_Mono, Zalando_Sans } from "next/font/google";
import "./globals.css";

const zalandoSans = Zalando_Sans({
  axes: ["wdth"],
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  weight: "variable",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: "A humanist email client.",
  title: "manual.email",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="en"
      className={`${zalandoSans.className} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-w-full flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
