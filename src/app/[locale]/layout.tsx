import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { GameProvider } from '@/context/GameContext'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Dragon Dice — Yahtzee',
  description: 'Dragon Family World — play Yahtzee with friends and dragons!',
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-dragon-bg text-dragon-text antialiased">
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
