'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBrandStore } from '@/components/org-switcher'
import { withLocalQaMarker } from '@/lib/whitelabel-api'

export default function AgentFloatingButton() {
  const router = useRouter()
  const pathname = usePathname()
  const brandId = useBrandStore((s) => s.activeBrand.id)
  const [suggestionCount, setSuggestionCount] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!brandId) {
      setSuggestionCount(0)
      setPulse(false)
      return
    }

    fetch(withLocalQaMarker(`/api/proxy/api/ai/agent-suggestions?brand_id=${encodeURIComponent(brandId)}`))
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d) => {
        const count = d.suggestions?.length ?? 0
        setSuggestionCount(count)
        setPulse(count > 0)
      })
      .catch(() => {
        setSuggestionCount(0)
        setPulse(false)
      })
  }, [brandId])

  if (
    pathname?.startsWith('/dashboard/outreach')
    || pathname?.startsWith('/dashboard/support')
    || pathname?.startsWith('/dashboard/agent')
  ) {
    return null
  }

  return (
    <div className='fixed bottom-6 right-6 z-50 hidden md:block'>
      <Button
        size='icon'
        aria-label='Open Atlas AI assistant'
        onClick={() => router.push('/dashboard/agent')}
        className={cn(
          'relative size-14 rounded-full shadow-lg',
          'bg-gradient-to-br from-violet-500 to-indigo-600',
          'hover:from-violet-600 hover:to-indigo-700',
          'transition-all duration-200 hover:scale-105'
        )}
      >
        <Icons.sparkles className='size-6 text-white' />

        {/* Pulse ring */}
        {pulse && (
          <span className='absolute inset-0 -z-10 hidden animate-ping rounded-full bg-violet-500/40 sm:block' />
        )}

        {/* Badge */}
        {suggestionCount > 0 && (
          <span className='absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground'>
            {suggestionCount}
          </span>
        )}
      </Button>
    </div>
  )
}
