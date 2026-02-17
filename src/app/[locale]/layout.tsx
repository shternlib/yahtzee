import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { GameProvider } from '@/context/GameContext'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Yahtzee Multiplayer',
  description: 'Play Yahtzee with friends online',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="bg-gray-900 text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          <GameProvider>
            <main className="min-h-dvh max-w-lg mx-auto">
              {children}
            </main>
          </GameProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
