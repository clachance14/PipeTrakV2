import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface GitHubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
}

interface ChangelogModalProps {
  release: GitHubRelease
  isOpen: boolean
  onClose: () => void
}

/**
 * Format ISO date string to readable format
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Simple markdown-to-JSX renderer for release notes
 * Handles: headers (##), bold (**), italic (_), links, lists (-)
 */
function renderMarkdown(markdown: string): JSX.Element[] {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const elements: JSX.Element[] = []
  let key = 0

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      // Empty line
      elements.push(<br key={key++} />)
      continue
    }

    // Headers (##, ###)
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="text-lg font-semibold mt-4 mb-2">
          {trimmed.slice(3)}
        </h2>
      )
      continue
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold mt-3 mb-1">
          {trimmed.slice(4)}
        </h3>
      )
      continue
    }

    // List items (-, *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2)
      elements.push(
        <li key={key++} className="ml-4 mb-1">
          {renderInlineMarkdown(content)}
        </li>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="mb-2">
        {renderInlineMarkdown(trimmed)}
      </p>
    )
  }

  return elements
}

/**
 * Render inline markdown: **bold**, _italic_, [links](url)
 */
function renderInlineMarkdown(text: string): (string | JSX.Element)[] {
  const elements: (string | JSX.Element)[] = []
  let key = 0
  let remaining = text

  // Simple regex patterns for inline markdown
  const boldRegex = /\*\*([^*]+)\*\*/
  const italicRegex = /_([^_]+)_/
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/

  while (remaining) {
    const boldMatch = remaining.match(boldRegex)
    const italicMatch = remaining.match(italicRegex)
    const linkMatch = remaining.match(linkRegex)

    // Find earliest match
    const matches = [
      { match: boldMatch, type: 'bold' },
      { match: italicMatch, type: 'italic' },
      { match: linkMatch, type: 'link' }
    ].filter((m) => m.match !== null)

    if (matches.length === 0) {
      // No more inline markdown
      elements.push(remaining)
      break
    }

    // Get the earliest match
    const earliest = matches.reduce((prev, curr) => {
      const prevIndex = prev.match?.[0] ? remaining.indexOf(prev.match[0]) : Infinity
      const currIndex = curr.match?.[0] ? remaining.indexOf(curr.match[0]) : Infinity
      return currIndex < prevIndex ? curr : prev
    })

    const match = earliest.match
    if (!match) break

    const index = remaining.indexOf(match[0])

    // Add text before match
    if (index > 0) {
      elements.push(remaining.slice(0, index))
    }

    // Add formatted element
    if (earliest.type === 'bold') {
      elements.push(
        <strong key={key++} className="font-semibold">
          {match[1]}
        </strong>
      )
    } else if (earliest.type === 'italic') {
      elements.push(
        <em key={key++} className="italic">
          {match[1]}
        </em>
      )
    } else if (earliest.type === 'link') {
      elements.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {match[1]}
        </a>
      )
    }

    // Continue with remaining text
    remaining = remaining.slice(index + match[0].length)
  }

  return elements
}

export function ChangelogModal({ release, isOpen, onClose }: ChangelogModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            What's New
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {release.name} • {formatDate(release.published_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="prose prose-sm max-w-none my-4">
          {renderMarkdown(release.body)}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
