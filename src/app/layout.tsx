import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/app/app-shell"
import { Toaster } from "@/components/ui/sonner"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "RouteWise – Transportation Planning",
  description: "SAP-integrated transportation planning and route optimization prototype",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
