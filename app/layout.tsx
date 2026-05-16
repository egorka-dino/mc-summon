import { ClerkProvider } from "@clerk/nextjs";
import type React from "react";
import "../style.css";
import "./globals.css";

const clerkLocalization = {
  socialButtonsBlockButton: "Войти через портал",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
