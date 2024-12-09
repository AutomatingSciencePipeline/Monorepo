import '../styles/globals.css';
import '../styles/experimentListing.css';
import RouteHandler from './RouteHandler';
import Head from 'next/head';

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