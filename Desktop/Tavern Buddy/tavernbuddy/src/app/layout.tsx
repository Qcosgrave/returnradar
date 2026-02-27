import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tavernbuddy — Weekly AI Insights for Bar Owners',
  description: 'Connect your Square POS and get weekly AI-powered insights delivered every Monday morning.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0f1117] text-slate-100 antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1f2e',
              color: '#f1f5f9',
              border: '1px solid #2d3748',
            },
            success: {
              iconTheme: { primary: '#f59e0b', secondary: '#0f1117' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0f1117' },
            },
          }}
        />
      </body>
    </html>
  )
}
