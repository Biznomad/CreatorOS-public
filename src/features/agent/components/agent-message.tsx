'use client'

import { useState } from 'react'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import type { ChatMessage, AgentAction, AgentSuggestion, CreatorCardData } from './agent-chat'

interface AgentMessageProps {
  message: ChatMessage
  onExecuteAction: (action: AgentAction, dryRun?: boolean) => Promise<void>
  onAcceptSuggestion: (suggestion: AgentSuggestion) => void
}

function hasPositiveStat(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function sanitizeCreatorStatsCopy(value: string): string {
  return value
    .replace(/\b0 followers,\s*and\s*0(?:\.0)?% engagement\b/gi, 'followers unavailable and engagement unavailable')
    .replace(/\b([\d,.]+[KMB]?\s+followers),\s*and\s*0(?:\.0)?% engagement\b/gi, '$1 and engagement unavailable')
    .replace(/\b0 followers,\s*0(?:\.0)?% ER\b/gi, 'followers unavailable, ER unavailable')
}

function formatMarkdown(text: string): string {
  let html = sanitizeCreatorStatsCopy(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks (triple backtick)
  html = html.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    '<pre class="my-2 rounded-md bg-muted p-3 text-xs overflow-x-auto"><code>$2</code></pre>'
  )

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">$1</code>'
  )

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')

  // Bullet lists
  html = html.replace(
    /^[-*] (.+)$/gm,
    '<li class="ml-4 list-disc">$1</li>'
  )
  html = html.replace(
    /(<li[^>]*>.*<\/li>\n?)+/g,
    (match) => `<ul class="my-1 space-y-0.5">${match}</ul>`
  )

  // Numbered lists
  html = html.replace(
    /^\d+\. (.+)$/gm,
    '<li class="ml-4 list-decimal">$1</li>'
  )
  html = html.replace(
    /(<li class="ml-4 list-decimal">.*<\/li>\n?)+/g,
    (match) => `<ol class="my-1 space-y-0.5">${match}</ol>`
  )

  // Line breaks
  html = html.replace(/\n/g, '<br />')

  return html
}

function AtlasAvatar() {
  return (
    <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm'>
      <Icons.sparkles className='size-4 text-white' />
    </div>
  )
}

function CreatorCard({
  creator,
  onExecuteAction
}: {
  creator: CreatorCardData
  onExecuteAction: (action: AgentAction, dryRun?: boolean) => Promise<void>
}) {
  const [pendingAction, setPendingAction] = useState<AgentAction | null>(null)
  const requestLiveAction = (action: AgentAction) => setPendingAction(action)
  const confirmLiveAction = () => {
    if (!pendingAction) return
    void onExecuteAction(pendingAction, false)
    setPendingAction(null)
  }

  return (
    <div className='my-2 min-w-0 overflow-hidden rounded-lg border bg-card p-3 shadow-sm'>
      <div className='flex min-w-0 items-center gap-3'>
        <Avatar className='size-10 bg-muted'>
          <AvatarImage src={creator.avatar_url} alt={creator.handle} />
          <AvatarFallback>
            <Icons.user className='size-5 text-muted-foreground' />
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1'>
          <p className='truncate font-medium text-sm'>
            {creator.display_name || `@${creator.handle.replace(/^@/, '')}`}
          </p>
          <p className='truncate text-xs text-muted-foreground'>@{creator.handle.replace(/^@/, '')}</p>
        </div>
        {creator.score != null && (
          <Badge variant='secondary' className='shrink-0'>
            Score: {creator.score}
          </Badge>
        )}
      </div>
      <div className='mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground'>
        {creator.follower_count != null && (
          <span>
            {hasPositiveStat(creator.follower_count)
              ? `${creator.follower_count >= 1000
                ? `${(creator.follower_count / 1000).toFixed(1)}K`
                : creator.follower_count} followers`
              : 'Followers unavailable'}
          </span>
        )}
        {creator.engagement_rate != null && (
          <span>{hasPositiveStat(creator.engagement_rate) ? `${Number(creator.engagement_rate).toFixed(1)}% ER` : 'ER unavailable'}</span>
        )}
        {creator.platform && (
          <Badge variant='outline' className='text-[10px]'>
            {creator.platform}
          </Badge>
        )}
      </div>
      <div className='mt-3 flex min-w-0 flex-wrap gap-2'>
        <Button
          size='sm'
          variant='outline'
          className='min-h-11'
          aria-label={`Confirm proposal draft for ${creator.handle}`}
          onClick={() =>
            requestLiveAction({
              type: 'propose',
              label: 'Propose',
              params: { handle: creator.handle, platform: creator.platform || 'instagram' }
            })
          }
        >
          Propose
        </Button>
        <Button
          size='sm'
          variant='outline'
          className='min-h-11'
          aria-label={`Confirm creator analysis for ${creator.handle}`}
          onClick={() =>
            requestLiveAction({
              type: 'analyze',
              label: 'Analyze',
              params: { handle: creator.handle }
            })
          }
        >
          Analyze
        </Button>
        <Button
          size='sm'
          variant='outline'
          className='min-h-11'
          aria-label={`Confirm content brief for ${creator.handle}`}
          onClick={() =>
            requestLiveAction({
              type: 'create_brief',
              label: 'Brief',
              params: { handle: creator.handle, content_type: 'reel' }
            })
          }
        >
          Brief
        </Button>
      </div>
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Atlas action?</AlertDialogTitle>
            <AlertDialogDescription>
              Atlas will run {pendingAction?.label || 'this action'} for @{creator.handle.replace(/^@/, '')}. Use generated previews and CRM review before sending anything externally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction aria-label={`Run Atlas ${pendingAction?.label || 'action'} for ${creator.handle}`} onClick={confirmLiveAction}>
              Run action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ActionButtons({
  actions,
  onExecuteAction
}: {
  actions: AgentAction[]
  onExecuteAction: (action: AgentAction, dryRun?: boolean) => Promise<void>
}) {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null)
  const [previewingIdx, setPreviewingIdx] = useState<number | null>(null)
  const [pendingAction, setPendingAction] = useState<{ action: AgentAction; idx: number } | null>(null)

  const previewableActions = new Set<AgentAction['type']>([
    'discover',
    'analyze',
    'propose',
    'batch_propose',
    'create_brief',
    'run_enrichment'
  ])

  const handleClick = async (action: AgentAction, idx: number, dryRun = false) => {
    if (action.executed) return
    if (dryRun) {
      setPreviewingIdx(idx)
    } else {
      setLoadingIdx(idx)
    }
    try {
      await onExecuteAction(action, dryRun)
    } finally {
      if (dryRun) {
        setPreviewingIdx(null)
      } else {
        setLoadingIdx(null)
      }
    }
  }

  return (
    <div className='mt-2 flex min-w-0 flex-wrap gap-2'>
      {actions.map((action, idx) => {
        const canPreview = previewableActions.has(action.type)
        const busy = loadingIdx !== null || previewingIdx !== null
        return (
          <div key={idx} className='flex gap-1'>
            {canPreview && !action.executed && (
              <Button
                size='sm'
                variant='outline'
                disabled={busy}
                aria-label={`Preview Atlas action ${action.label}`}
                onClick={() => handleClick(action, idx, true)}
                className='min-h-11 gap-1.5'
              >
                {previewingIdx === idx ? <Icons.spinner className='size-3 animate-spin' /> : null}
                Preview
              </Button>
            )}
            <Button
              size='sm'
              variant={action.executed ? 'secondary' : 'outline'}
              disabled={action.executed || busy}
              aria-label={action.executed ? `Atlas action ${action.label} completed` : `Confirm Atlas action ${action.label}`}
              onClick={() => setPendingAction({ action, idx })}
              className='min-h-11 gap-1.5'
            >
              {loadingIdx === idx ? (
                <Icons.spinner className='size-3 animate-spin' />
              ) : action.executed ? (
                <Icons.check className='size-3' />
              ) : null}
              {action.executed ? action.label : canPreview ? 'Run' : action.label}
            </Button>
          </div>
        )
      })}
      <AlertDialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Atlas action?</AlertDialogTitle>
            <AlertDialogDescription>
              Atlas will run {pendingAction?.action.label || 'this action'} against the active Demo Brand workspace. Preview first when you need a read-only check.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              aria-label={`Run Atlas ${pendingAction?.action.label || 'action'}`}
              onClick={() => {
                if (!pendingAction) return
                void handleClick(pendingAction.action, pendingAction.idx, false)
                setPendingAction(null)
              }}
            >
              Run action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SuggestionCards({
  suggestions,
  onAccept
}: {
  suggestions: AgentSuggestion[]
  onAccept: (suggestion: AgentSuggestion) => void
}) {
  return (
    <div className='mt-3 space-y-2'>
      {suggestions.map((suggestion, idx) => (
        <div
          key={idx}
          className='flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2'
        >
          <div className='flex-1 min-w-0'>
            {suggestion.type && (
              <Badge variant='outline' className='mb-1 text-[10px]'>
                {suggestion.type}
              </Badge>
            )}
            <p className='text-sm'>{suggestion.message || suggestion.label || 'Suggested action'}</p>
          </div>
          <Button
            size='sm'
            variant='default'
            aria-label={`Accept Atlas suggestion ${suggestion.label || suggestion.type || idx + 1}`}
            onClick={() => onAccept(suggestion)}
            className='min-h-11 shrink-0'
          >
            Accept
          </Button>
        </div>
      ))}
    </div>
  )
}

export default function AgentMessage({
  message,
  onExecuteAction,
  onAcceptSuggestion
}: AgentMessageProps) {
  const isUser = message.role === 'user'
  const isActionResult = message.role === 'action-result'

  if (isUser) {
    return (
      <div className='flex justify-end'>
        <div className='max-w-[80%] min-w-0 overflow-hidden break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground'>
          {message.content}
        </div>
      </div>
    )
  }

  if (isActionResult) {
    return (
      <div className='flex gap-3'>
        <div className='size-8 shrink-0' />
        <div className='max-w-[85%] min-w-0 overflow-hidden rounded-lg border border-dashed bg-muted/50 px-4 py-2.5 text-sm'>
          <p className='mb-1 text-xs font-medium text-muted-foreground'>
            Action Result
          </p>
          <div
            className='prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto'
            dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
          />
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className='flex gap-3'>
      <AtlasAvatar />
      <div className='max-w-[85%] min-w-0 space-y-2 overflow-hidden'>
        <div className='min-w-0 overflow-hidden rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm'>
          <div
            className='prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0'
            dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
          />
        </div>

        {message.creatorCards && message.creatorCards.length > 0 && (
          <div className='space-y-2'>
            {message.creatorCards.map((creator, idx) => (
              <CreatorCard
                key={idx}
                creator={creator}
                onExecuteAction={onExecuteAction}
              />
            ))}
          </div>
        )}

        {message.actions && message.actions.length > 0 && (
          <ActionButtons
            actions={message.actions}
            onExecuteAction={onExecuteAction}
          />
        )}

        {message.suggestions && message.suggestions.length > 0 && (
          <SuggestionCards
            suggestions={message.suggestions}
            onAccept={onAcceptSuggestion}
          />
        )}
      </div>
    </div>
  )
}
