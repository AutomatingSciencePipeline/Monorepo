import type { AppProps } from "next/app"
import { SessionProvider } from "next-auth/react"

console.log("in _app...");

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />;
    </SessionProvider>
  )
}