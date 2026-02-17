'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ShareLinkProps {
  roomCode: string
}

export function ShareLink({ roomCode }: ShareLinkProps) {
  const t = useTranslations('lobby')
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.match(/^\/\w{2}/)?.[0] || '/en'}/game/${roomCode}`
    : ''

  const handleCopy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Yahtzee', url: shareUrl })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // User cancelled share dialog
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-gray-800/50 rounded-2xl">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{t('roomCode')}</p>
      <p className="text-4xl font-mono font-bold tracking-[0.3em] text-white">{roomCode}</p>
      <button
        onClick={handleCopy}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold active:bg-blue-700 transition-colors"
      >
        {copied ? t('linkCopied') : t('copyLink')}
      </button>
    </div>
  )
}
