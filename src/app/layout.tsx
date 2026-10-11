import "./globals.css";

// The localized layout in [locale]/layout.tsx renders <html> and <body>.
// This root layout only exists so the root not-found page has a layout.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
