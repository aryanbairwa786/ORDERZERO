import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrderZero — Market Structure Learning Terminal",
  description: "An educational Indian-market terminal with a generated order-block demo, chart studies, a playbook, and a trade journal.",
  keywords: "order block, smart money concepts, SMC, Indian stocks, NIFTY 50, F&O, liquidity, FVG, BOS, CHoCH",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090B] text-white antialiased min-h-screen">
        <div className="flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
