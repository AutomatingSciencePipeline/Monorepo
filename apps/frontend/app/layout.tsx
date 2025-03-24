import '../styles/globals.css';
import '../styles/experimentListing.css';
import RouteHandler from './RouteHandler';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GLADOS',
  description: 'GLADOS: A platform for running experiments',
  icons: [
    { rel: "icon", url: "/glados-logo.ico" }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <RouteHandler>{children}</RouteHandler>
      </body>
    </html>
  );
}