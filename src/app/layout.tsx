import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Readly",
  description: "Your intelligent RSS reader",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lato.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
