'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useBrandStore } from '@/components/org-switcher'
import { withLocalQaMarker } from '@/lib/whitelabel-api'
import AgentMessage from './agent-message'
import AgentInput from './agent-input'

const DEFAULT_BRAND_ID = process.env.NEXT_PUBLIC_CREATOROS_DEFAULT_BRAND_ID || 'demo-brand'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'action-result'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  actions?: AgentAction[]
  suggestions?: AgentSuggestion[]
  creatorCards?: CreatorCardData[]
}

export interface AgentAction {
  type:
    | 'discover'
    | 'analyze'
    | 'propose'
    | 'batch_propose'
    | 'create_brief'
    | 'move_pipeline'
    | 'run_enrichment'
    | 'batch_follow_up'
    | 'feature_brief'
  label: string
  params: {
    creator_id?: string
    handle?: string
    platform?: string
    status?: string
    limit?: number
    content?: string
    [key: string]: unknown
  }
  executed?: boolean
}

export interface AgentSuggestion {
  type: 'outreach' | 'follow_up' | 'discovery' | 'feature' | 'optimization' | 'integration' | 'readiness' | 'qa'
  message: string
  label?: string
  action: AgentAction
}

export interface CreatorCardData {
  handle: string
  display_name?: string
  avatar_url?: string
  follower_count?: number
  engagement_rate?: number
  score?: number
  platform?: string
}

type EnrichedCreator = {
  handle?: string
  display_name?: string
  follower_count?: number
  engagement_rate?: number
}

type FollowUpItem = {
  id?: string
  handle?: string
  display_name?: string
  channel?: string
  message?: string
  follow_up_draft?: string
}

type SmartQueueCreator = {
  handle?: string
  display_name?: string
  platform?: string
  score?: number
  follower_count?: number
  engagement_rate?: number
  priority?: string
  reason?: string
  recommended_action?: string
}

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function sessionsKey(brandId: string): string {
  return `atlas-sessions-${brandId}`
}

function loadLocalSessions(brandId: string): ChatSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(sessionsKey(brandId))
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

function saveLocalSessions(brandId: string, sessions: ChatSession[]) {
  try {
    localStorage.setItem(sessionsKey(brandId), JSON.stringify(sessions))
  } catch {
    // quota exceeded
  }
}

async function readJson(res: Response) {
  return res.json().catch(() => ({}))
}

async function loadRemoteSessions(brandId: string): Promise<ChatSession[]> {
  const res = await fetch(withLocalQaMarker(`/api/proxy/api/ai/chat-sessions?brand_id=${encodeURIComponent(brandId)}`))
  const data = await readJson(res)
  if (!res.ok) throw new Error(data.detail || data.error || 'Could not load Atlas history')
  return Array.isArray(data.sessions) ? data.sessions as ChatSession[] : []
}

async function saveRemoteSessions(brandId: string, sessions: ChatSession[]) {
  const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/chat-sessions'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand_id: brandId, sessions })
  })
  const data = await readJson(res)
  if (!res.ok) throw new Error(data.detail || data.error || 'Could not save Atlas history')
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  const text = first.content.slice(0, 50)
  return text.length < first.content.length ? `${text}...` : text
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

function formatFollowerStat(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${value.toLocaleString()} followers`
    : 'followers unavailable'
}

function formatEngagementStat(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? `${value.toFixed(1)}% ER`
    : 'ER unavailable'
}

function sanitizeCreatorStatsCopy(value: string): string {
  return value
    .replace(/\b0 followers,\s*and\s*0(?:\.0)?% engagement\b/gi, 'followers unavailable and engagement unavailable')
    .replace(/\b([\d,.]+[KMB]?\s+followers),\s*and\s*0(?:\.0)?% engagement\b/gi, '$1 and engagement unavailable')
    .replace(/\b0 followers,\s*0(?:\.0)?% ER\b/gi, 'followers unavailable, ER unavailable')
}

function getLocalQaFallbackBrandId(): string {
  if (typeof window === 'undefined') return ''
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  return isLocalHost && window.location.search.includes('qa=1') ? DEFAULT_BRAND_ID : ''
}

// ---------------------------------------------------------------------------
// Default suggestions shown on empty conversation
// ---------------------------------------------------------------------------

const DEFAULT_PROMPTS = [
  {
    label: 'Who are my top creators?',
    icon: Icons.trendingUp
  },
  {
    label: 'Send proposals to top 5',
    icon: Icons.send
  },
  {
    label: "What's my pipeline status?",
    icon: Icons.kanban
  },
  {
    label: 'Find new creators in #guthealth',
    icon: Icons.search
  }
]

// ---------------------------------------------------------------------------
// Action executor
// ---------------------------------------------------------------------------

async function executeAction(
  brandId: string,
  action: AgentAction,
  dryRun = false
): Promise<string> {
  if (!brandId) {
    throw new Error('Select a client brand before running Atlas actions.')
  }

  const headers = { 'Content-Type': 'application/json' }

  switch (action.type) {
    case 'discover': {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/discover'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          keywords: action.params.keywords,
          platform: action.params.platform || 'instagram',
          limit: action.params.limit || 10,
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Discovery failed')
      const count = data.creators?.length ?? data.count ?? 0
      if (dryRun) {
        return data.message || `Dry run ready: would discover **${count}** creators matching your criteria.`
      }
      return `Discovered **${count}** creators matching your criteria.`
    }

    case 'analyze': {
      const handle = (action.params.handle || '').replace(/^@/, '')
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/analyze-creator'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          handle,
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Analysis failed')
      return `${dryRun ? '**Preview only.** ' : ''}${data.analysis || JSON.stringify(data, null, 2)}`
    }

    case 'propose': {
      const handle = String(action.params.handle || '').replace(/^@/, '').trim()
      if (handle) {
        const platform = String(action.params.platform || 'instagram')
        const res = await fetch(withLocalQaMarker('/api/proxy/api/outreach'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            brand_id: brandId,
            handle,
            platform,
            channel: platform === 'tiktok' ? 'email' : 'dm',
            dry_run: dryRun
          })
        })
        const data = await readJson(res)
        if (!res.ok) throw new Error(data.detail || data.error || 'Proposal failed')
        if (dryRun) {
          return data.message || `Dry run ready: would create a proposal draft for **@${handle}**.`
        }
        return `Proposal draft saved for **@${handle}**. Review it in Outreach CRM before sending.`
      }

      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/batch-proposals'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          limit: 1,
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Proposal failed')
      return data.message || `Generated ${data.sent || data.count || 0} proposal draft(s). Review them in Outreach CRM before sending.`
    }

    case 'batch_propose': {
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/batch-proposals'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          limit: action.params.limit || 5,
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Batch proposals failed')
      const count = data.count ?? data.sent ?? data.proposals?.length ?? 0
      if (data.message) return `${data.message} Review drafts in Outreach CRM before sending.`
      return `Generated **${count}** proposal draft${count === 1 ? '' : 's'}. Review them in Outreach CRM before sending.`
    }

    case 'create_brief': {
      const handle = String(action.params.handle || '').replace(/^@/, '').trim()
      if (!handle) {
        throw new Error('Choose a creator before asking Atlas to create a content brief.')
      }
      const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/content-brief'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          handle,
          content_type: action.params.content_type || 'reel',
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Brief creation failed')
      return `${dryRun ? '**Preview only.** ' : ''}${data.brief || JSON.stringify(data, null, 2)}`
    }

    case 'move_pipeline': {
      const creatorId = action.params.creator_id
      const status = action.params.status
      if (!creatorId || !status) {
        throw new Error('Atlas needs a creator and target stage before moving the pipeline.')
      }
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/creators/${creatorId}/status?brand_id=${encodeURIComponent(brandId)}`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ brand_id: brandId, status })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Pipeline move failed')
      return `Creator moved to **${status}** stage.`
    }

    case 'batch_follow_up': {
      const limit = action.params.limit || 10
      const res = await fetch(withLocalQaMarker(`/api/proxy/api/outreach/follow-ups?brand_id=${encodeURIComponent(brandId)}&limit=${limit}`))
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Follow-up lookup failed')
      const rows = (Array.isArray(data) ? data : []) as FollowUpItem[]
      if (!rows.length) {
        return 'No outreach records currently need follow-up. Atlas will keep watching sent proposals and replies.'
      }
      const drafts = rows.slice(0, Number(limit)).map((item, index) => {
        const handle = (item.handle || item.display_name || `creator ${index + 1}`).replace(/^@/, '')
        const draft = item.follow_up_draft
          || `Hey ${item.display_name || `@${handle}`}, circling back on the whitelisting proposal. Happy to start with a simple product-fit check and usage-rights test if you are open to it.`
        return `${index + 1}. **@${handle}** (${item.channel || 'dm'}): ${draft}`
      })
      return `Drafted **${drafts.length}** follow-up${drafts.length === 1 ? '' : 's'} from current outreach records:\n\n${drafts.join('\n')}\n\nReview these before sending externally from Outreach CRM.`
    }

    case 'run_enrichment': {
      const limit = action.params.limit || 5
      const res = await fetch(withLocalQaMarker('/api/proxy/api/enrichment/run'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brand_id: brandId,
          limit,
          dry_run: dryRun
        })
      })
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Enrichment failed')
      if (dryRun) {
        return data.message || `Dry run ready: would attempt enrichment for **${data.would_enrich ?? data.creators?.length ?? 0}** creator(s).`
      }
      if (data.enriched === 0) {
        return data.message || 'No creators needed enrichment.'
      }
      const lines = (data.creators as EnrichedCreator[] | undefined)?.map((c) =>
        `- **@${(c.handle || '').replace(/^@/, '')}** ${c.display_name || ''} — ${formatFollowerStat(c.follower_count)}, ${formatEngagementStat(c.engagement_rate)}`
      ) || []
      return `Enriched **${data.enriched}** creators with real profile data:\n\n${lines.join('\n')}`
    }

    case 'feature_brief': {
      if (typeof action.params.content === 'string' && action.params.content.trim()) {
        return action.params.content
      }

      const res = await fetch(withLocalQaMarker(`/api/proxy/api/ai/smart-queue?brand_id=${encodeURIComponent(brandId)}&limit=5`))
      const data = await readJson(res)
      if (!res.ok) throw new Error(data.detail || data.error || 'Top performer analysis failed')

      const creators = ((data.creators || data.queue || []) as SmartQueueCreator[]).slice(0, 5)
      if (!creators.length) {
        return 'Atlas did not find enough creator data to analyze top performers yet. Run discovery or import Shopify customers, then come back to build lookalike criteria.'
      }

      const lines = creators.map((creator, index) => {
        const handle = String(creator.handle || creator.display_name || `creator ${index + 1}`).replace(/^@/, '')
        const score = Number(creator.score || 0).toFixed(1)
        const followers = formatFollowerStat(creator.follower_count)
        const engagement = formatEngagementStat(creator.engagement_rate)
        const reason = creator.reason || creator.recommended_action || 'High-priority creator for whitelisting review.'
        return `${index + 1}. **@${handle}** (${creator.platform || 'creator'}, score ${score}) — ${followers}, ${engagement}. ${reason}`
      })

      return `Top performer analysis from the live creator queue:\n\n${lines.join('\n')}\n\nLookalike criteria to test next: prioritize creators with similar platform, engagement quality, score band, customer history signals, and content niche.`
    }

    default:
      return 'Unknown action type.'
  }
}

// ---------------------------------------------------------------------------
// Session Sidebar
// ---------------------------------------------------------------------------

function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
  canCreate
}: {
  sessions: ChatSession[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClose: () => void
  canCreate: boolean
}) {
  return (
    <div className='absolute inset-y-0 left-0 z-20 flex w-[min(18rem,calc(100vw-2rem))] flex-col border-r bg-background shadow-xl md:relative md:z-auto md:w-64 md:bg-muted/30 md:shadow-none'>
      <div className='flex items-center justify-between gap-2 border-b px-3 py-3'>
        <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
          History
        </p>
        <div className='flex items-center gap-1'>
          <Button
            size='sm'
            variant='ghost'
            onClick={onNew}
            disabled={!canCreate}
            className='min-h-11 min-w-11 p-0'
            aria-label='Start new conversation'
          >
            <Icons.add className='size-4' />
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={onClose}
            className='min-h-11 min-w-11 p-0 md:hidden'
            aria-label='Hide conversation history'
          >
            <Icons.close className='size-4' />
          </Button>
        </div>
      </div>
      <ScrollArea className='flex-1'>
        <div className='p-2 space-y-0.5'>
          {sessions.length === 0 && (
            <p className='px-2 py-6 text-center text-xs text-muted-foreground'>
              No conversations yet
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'group flex items-center gap-2 rounded-md text-sm',
                'transition-colors hover:bg-accent',
                activeId === session.id && 'bg-accent'
              )}
            >
              <button
                type='button'
                className='flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left'
                onClick={() => onSelect(session.id)}
                aria-current={activeId === session.id ? 'page' : undefined}
              >
                <Icons.chat className='size-3.5 shrink-0 text-muted-foreground' />
                <div className='flex-1 min-w-0'>
                  <p className='truncate text-sm'>{session.title}</p>
                  <p className='text-[10px] text-muted-foreground'>
                    {formatRelativeTime(session.updatedAt)}
                  </p>
                </div>
              </button>
              <Button
                size='sm'
                variant='ghost'
                className='mr-1 min-h-11 min-w-11 shrink-0 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                aria-label={`Delete conversation ${session.title}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(session.id)
                }}
              >
                <Icons.trash className='size-4 text-muted-foreground' />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AgentChat() {
  const selectedBrandId = useBrandStore((s) => s.activeBrand.id)
  const brandId = selectedBrandId || getLocalQaFallbackBrandId()
  const fetchBrands = useBrandStore((s) => s.fetchBrands)
  const hasBrand = Boolean(brandId)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const didInit = useRef(false)
  const saveErrorShown = useRef(false)

  // Derive current messages from active session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null
  const messages = useMemo(() => activeSession?.messages || [], [activeSession])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSidebarOpen(window.innerWidth >= 768)
  }, [])

  useEffect(() => {
    if (selectedBrandId) return
    void fetchBrands().catch(() => undefined)
  }, [selectedBrandId, fetchBrands])

  // Load sessions on mount
  useEffect(() => {
    setSessions([])
    setActiveSessionId(null)
    setInput('')
    didInit.current = false
    saveErrorShown.current = false

    if (!brandId) {
      return
    }

    let cancelled = false

    async function load() {
      let stored: ChatSession[] = []
      try {
        stored = await loadRemoteSessions(brandId)
      } catch {
        stored = loadLocalSessions(brandId)
      }

      const localStored = loadLocalSessions(brandId)
      if (stored.length === 0 && localStored.length > 0) {
        stored = localStored
        void saveRemoteSessions(brandId, stored).catch(() => undefined)
      }

      // Migrate old single-chat format
      try {
        const oldKey = `atlas-chat-${brandId}`
        const oldRaw = localStorage.getItem(oldKey)
        if (oldRaw) {
          const oldMsgs = JSON.parse(oldRaw) as ChatMessage[]
          if (oldMsgs.length > 0) {
            const migrated: ChatSession = {
              id: uid(),
              title: deriveTitle(oldMsgs),
              messages: oldMsgs,
              createdAt: oldMsgs[0]?.timestamp || Date.now(),
              updatedAt: oldMsgs[oldMsgs.length - 1]?.timestamp || Date.now()
            }
            stored.push(migrated)
            void saveRemoteSessions(brandId, stored).catch(() => saveLocalSessions(brandId, stored))
            localStorage.removeItem(oldKey)
          }
        }
      } catch {
        // ignore migration errors
      }

      if (cancelled) return
      setSessions(stored)
      setActiveSessionId(stored[0]?.id || null)
      didInit.current = true
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [brandId])

  // Persist sessions on change
  useEffect(() => {
    if (!brandId || !didInit.current) return
    const timeout = window.setTimeout(() => {
      saveRemoteSessions(brandId, sessions).catch(() => {
        saveLocalSessions(brandId, sessions)
        if (!saveErrorShown.current) {
          saveErrorShown.current = true
          toast.error('Atlas history is saved locally until the backend reconnects.')
        }
      })
    }, 400)
    return () => window.clearTimeout(timeout)
  }, [sessions, brandId])

  // Fetch initial suggestions
  useEffect(() => {
    if (!brandId) {
      setSuggestions([])
      return
    }

    setSuggestions([])
    fetch(withLocalQaMarker(`/api/proxy/api/ai/agent-suggestions?brand_id=${encodeURIComponent(brandId)}`))
      .then((r) => (r.ok ? r.json() : { suggestions: [] }))
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => setSuggestions([]))
  }, [brandId])

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isLoading])

  // Update messages in the active session
  const updateActiveMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s
          const updated = updater(s.messages)
          return {
            ...s,
            messages: updated,
            title: deriveTitle(updated),
            updatedAt: Date.now()
          }
        })
      )
    },
    [activeSessionId]
  )

  const createNewSession = useCallback(() => {
    if (!brandId) {
      toast.error('Select a client brand before starting an Atlas conversation.')
      return
    }

    const session: ChatSession = {
      id: uid(),
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
  }, [brandId])

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id)
        if (activeSessionId === id) {
          setActiveSessionId(filtered[0]?.id || null)
        }
        return filtered
      })
    },
    [activeSessionId]
  )

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isLoading) return
      if (!brandId) {
        toast.error('Select a client brand before chatting with Atlas.')
        return
      }

      // Auto-create session if none active
      let sessionId = activeSessionId
      if (!sessionId) {
        const session: ChatSession = {
          id: uid(),
          title: 'New conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        sessionId = session.id
        setSessions((prev) => [session, ...prev])
        setActiveSessionId(sessionId)
      }

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content,
        timestamp: Date.now()
      }

      // Add user message to session
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          const msgs = [...s.messages, userMsg]
          return { ...s, messages: msgs, title: deriveTitle(msgs), updatedAt: Date.now() }
        })
      )
      setInput('')
      setIsLoading(true)

      try {
        // Get latest messages for conversation history
        const currentSession = sessions.find((s) => s.id === sessionId)
        const allMsgs = [...(currentSession?.messages || []), userMsg]
        const conversationHistory = allMsgs
          .filter((m) => m.role !== 'action-result')
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch(withLocalQaMarker('/api/proxy/api/ai/chat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand_id: brandId,
            message: content,
            conversation_history: conversationHistory
          })
        })

        const data = await readJson(res)

        if (!res.ok) {
          throw new Error(data.error || 'Failed to get response from Atlas')
        }

        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: sanitizeCreatorStatsCopy(String(data.response || '')),
          timestamp: Date.now(),
          actions: data.actions,
          suggestions: data.suggestions,
          creatorCards: data.creator_cards || []
        }

        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s
            const msgs = [...s.messages, assistantMsg]
            return { ...s, messages: msgs, title: deriveTitle(msgs), updatedAt: Date.now() }
          })
        )

        if (data.suggestions?.length) {
          setSuggestions(data.suggestions)
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        const errorMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${message}. Please try again.`,
          timestamp: Date.now()
        }
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== sessionId) return s
            return { ...s, messages: [...s.messages, errorMsg], updatedAt: Date.now() }
          })
        )
        toast.error('Atlas encountered an error')
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, activeSessionId, sessions, brandId]
  )

  const handleExecuteAction = useCallback(
    async (action: AgentAction, dryRun = false) => {
      try {
        const result = await executeAction(brandId, action, dryRun)

        // Mark live actions as executed + add result. Previews keep the action runnable.
        updateActiveMessages((prev) => {
          const updated = prev.map((msg) => {
            if (!msg.actions) return msg
            const acts = msg.actions.map((a) =>
              a === action && !dryRun ? { ...a, executed: true } : a
            )
            return { ...msg, actions: acts }
          })
          const resultMsg: ChatMessage = {
            id: uid(),
            role: 'action-result',
            content: sanitizeCreatorStatsCopy(result),
            timestamp: Date.now()
          }
          return [...updated, resultMsg]
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Action failed'
        toast.error(message)
        updateActiveMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'action-result' as const,
            content: `Action failed: ${message}`,
            timestamp: Date.now()
          }
        ])
      }
    },
    [brandId, updateActiveMessages]
  )

  const handleAcceptSuggestion = useCallback(
    async (suggestion: AgentSuggestion) => {
      if (suggestion.action) {
        await handleExecuteAction(suggestion.action)
        return
      }
      const text = suggestion.message || suggestion.label || 'Run suggested action'
      await sendMessage(text)
    },
    [handleExecuteAction, sendMessage]
  )

  const isEmpty = messages.length === 0

  return (
    <div className='relative flex h-[calc(100dvh-180px)] min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm'>
      {/* Session Sidebar */}
      {sidebarOpen && (
        <SessionSidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={(id) => {
            setActiveSessionId(id)
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
              setSidebarOpen(false)
            }
          }}
          onNew={createNewSession}
          onDelete={deleteSession}
          onClose={() => setSidebarOpen(false)}
          canCreate={hasBrand}
        />
      )}

      {/* Chat Area */}
      <div className='flex min-w-0 flex-1 flex-col'>
        {/* Header bar */}
        <div className='flex min-w-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-3 sm:flex-nowrap sm:px-4'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <Button
              size='sm'
              variant='ghost'
              aria-label={sidebarOpen ? 'Hide conversation history' : 'Show conversation history'}
              onClick={() => setSidebarOpen((v) => !v)}
              className='min-h-11 min-w-11 shrink-0 p-0 text-muted-foreground'
            >
              <Icons.panelLeft className='size-4' />
            </Button>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600'>
              <Icons.sparkles className='size-4 text-white' />
            </div>
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold'>Atlas</p>
              <p className='truncate text-xs text-muted-foreground'>
                AI Head of Creator Partnerships
              </p>
            </div>
          </div>
          <div className='ml-auto flex shrink-0 items-center gap-1'>
            <Button
              size='sm'
              variant='ghost'
              aria-label='Start new Atlas conversation'
              onClick={createNewSession}
              disabled={!hasBrand}
              className='min-h-11 gap-1.5 text-muted-foreground'
            >
              <Icons.add className='size-4' />
              New
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className='flex-1'>
          <div ref={scrollRef} className='flex h-full flex-col overflow-y-auto'>
            <div className='flex-1 space-y-4 p-4'>
              {isEmpty && (
                <div className='flex flex-col items-center justify-center py-12'>
                  <div className='mb-4 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/20'>
                    <Icons.sparkles className='size-8 text-violet-500' />
                  </div>
                  <h3 className='mb-1 text-lg font-semibold'>
                    {hasBrand ? 'How can I help today?' : 'Select a workspace to use Atlas'}
                  </h3>
                  <p className='mb-6 max-w-sm text-center text-sm text-muted-foreground'>
                    {hasBrand
                      ? 'I can discover creators, send proposals, analyze performance, and manage your pipeline.'
                      : 'Atlas keeps chat history, creator actions, and suggestions scoped to the active client workspace.'}
                  </p>
                  <div className='grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2'>
                    {DEFAULT_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.label}
                        disabled={!hasBrand}
                        onClick={() => sendMessage(prompt.label)}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg border bg-card px-4 py-3 text-left text-sm',
                          'transition-colors hover:bg-accent hover:text-accent-foreground',
                          !hasBrand && 'cursor-not-allowed opacity-50 hover:bg-card hover:text-foreground'
                        )}
                      >
                        <prompt.icon className='size-4 shrink-0 text-muted-foreground' />
                        {prompt.label}
                      </button>
                    ))}
                  </div>

                  {suggestions.length > 0 && (
                    <div className='mt-6 w-full max-w-lg'>
                      <p className='mb-2 text-xs font-medium text-muted-foreground'>
                        Suggestions for you
                      </p>
                      <div className='space-y-2'>
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleAcceptSuggestion(s)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg border bg-card px-4 py-3 text-left text-sm',
                              'transition-colors hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            <Icons.sparkles className='size-4 shrink-0 text-violet-500' />
                            {s.message || s.label || 'Suggested action'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg) => (
                <AgentMessage
                  key={msg.id}
                  message={msg}
                  onExecuteAction={handleExecuteAction}
                  onAcceptSuggestion={handleAcceptSuggestion}
                />
              ))}

              {isLoading && (
                <div className='flex gap-3'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600'>
                    <Icons.sparkles className='size-4 text-white' />
                  </div>
                  <div className='flex items-center gap-2 rounded-2xl rounded-tl-md bg-muted px-4 py-2.5'>
                    <Icons.spinner className='size-4 animate-spin text-muted-foreground' />
                    <span className='text-sm text-muted-foreground'>
                      Atlas is thinking...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Input */}
        <AgentInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage()}
          isLoading={isLoading}
          disabled={!hasBrand}
          placeholder={hasBrand ? 'Ask Atlas anything about your creators...' : 'Select a workspace before chatting with Atlas'}
        />
      </div>
    </div>
  )
}
