import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '⚾ Fantasy Baseball Draft 2026',
  description: 'BLND-powered H2H categories draft board',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans">{children}</body>
    </html>
  )
}
