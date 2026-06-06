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
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "manual.email",
  description: "A humanist email client.",
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
