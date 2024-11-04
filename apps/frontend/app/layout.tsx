import '../styles/globals.css';
import '../styles/experimentListing.css';
import RouteHandler from './RouteHandler';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head />
      <body className="h-full">
        <RouteHandler>{children}</RouteHandler>
      </body>
    </html>
  );
}