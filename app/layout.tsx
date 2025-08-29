export const metadata = {
  title: "PURK + SCN1 (PURK+) Risk Calculator",
  description: "Clinical decision support – PURK at presentation and SCN1 at ~1 year",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
