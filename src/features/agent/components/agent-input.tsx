'use client'

import { useRef, useCallback } from 'react'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AgentInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
}

export default function AgentInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
  placeholder = 'Ask Atlas anything about your creators...'
}: AgentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (value.trim() && !isLoading && !disabled) {
          onSend()
        }
      }
    },
    [value, isLoading, disabled, onSend]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    },
    [onChange]
  )

  return (
    <div className='min-w-0 border-t bg-background px-3 py-3 sm:px-4'>
      <div className='relative flex min-w-0 items-end gap-2'>
        <textarea
          aria-label='Atlas message'
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isLoading || disabled}
          placeholder={placeholder}
          rows={1}
          className={cn(
            'min-w-0 flex-1 resize-none rounded-lg border bg-muted/50 px-4 py-3 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'max-h-32'
          )}
        />
        <Button
          type='button'
          size='icon'
          aria-label='Send Atlas message'
          disabled={!value.trim() || isLoading || disabled}
          onClick={onSend}
          className='min-h-11 min-w-11 shrink-0 rounded-lg'
        >
          {isLoading ? (
            <Icons.spinner className='size-4 animate-spin' />
          ) : (
            <Icons.send className='size-4' />
          )}
        </Button>
      </div>
      <p className='mt-1.5 text-center text-xs text-muted-foreground'>
        Atlas can make mistakes. Verify important information.
      </p>
    </div>
  )
}
