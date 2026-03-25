import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS | GIS Team",
  description: "Employee Management System for the GIS Team",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
