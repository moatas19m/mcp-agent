import type { Metadata } from 'next'
import './globals.css'
import { Geist, Poppins } from 'next/font/google'
 
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: 'MCP App',
  description: 'Created by Hunzala, Zain Vohra, Moatasim, and Shahzaib',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en"  className={`${poppins.variable} font-poppins`}>
      <body>{children}</body>
    </html>
  )
}
