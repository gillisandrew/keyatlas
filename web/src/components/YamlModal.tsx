import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import type { Cheatsheet } from '@/data/types'
import { useHiddenEntries } from '@/context/HiddenEntriesContext'

function serializeKeys(keys: string[] | string[][]): string {
  if (Array.isArray(keys[0])) {
    // Chord: array of arrays
    const combos = keys as string[][]
    return `[${combos.map((c) => `[${c.map((k) => JSON.stringify(k)).join(', ')}]`).join(', ')}]`
  }
  // Single combo: flat array
  const combo = keys as string[]
  return `[${combo.map((k) => JSON.stringify(k)).join(', ')}]`
}

function generateYaml(cheatsheet: Cheatsheet, isHidden: (slug: string, id: string) => boolean) {
  const slug = cheatsheet.slug
  const lines: string[] = []

  lines.push(`app: ${cheatsheet.app}`)
  if (cheatsheet.subtitle) lines.push(`subtitle: ${cheatsheet.subtitle}`)
  if (cheatsheet.columns) lines.push(`columns: ${cheatsheet.columns}`)
  if (cheatsheet.color) lines.push(`color: "${cheatsheet.color}"`)
  lines.push('sections:')

  for (let si = 0; si < cheatsheet.sections.length; si++) {
    const section = cheatsheet.sections[si]
    const visibleEntries = section.entries.filter(
      (_, ei) => !isHidden(slug, `${si}-${ei}`),
    )
    if (visibleEntries.length === 0) continue

    lines.push(`  - name: ${section.name}`)
    lines.push('    entries:')

    for (const entry of visibleEntries) {
      lines.push(`      - keys: ${serializeKeys(entry.keys)}`)
      lines.push(`        action: ${JSON.stringify(entry.action)}`)
      if (entry.alt_keys) {
        lines.push(`        alt_keys: [${entry.alt_keys.map((k) => JSON.stringify(k)).join(', ')}]`)
      }
      if (entry.range) {
        lines.push(`        range: [${entry.range.map((k) => JSON.stringify(k)).join(', ')}]`)
      }
      if (entry.win_keys) {
        lines.push(`        win_keys: ${serializeKeys(entry.win_keys)}`)
      }
    }
  }

  return lines.join('\n')
}

function colorizeYaml(yaml: string): React.ReactNode[] {
  return yaml.split('\n').map((line, i) => {
    const parts: React.ReactNode[] = []

    // Comment lines
    if (line.trimStart().startsWith('#')) {
      parts.push(<span key={i} className="text-gray-400">{line}</span>)
      return <div key={i}>{parts}{'\n'}</div>
    }

    // Match leading whitespace + key: value
    const keyMatch = line.match(/^(\s*-?\s*)(\w[\w_]*)(:)(.*)$/)
    if (keyMatch) {
      const [, indent, key, colon, rest] = keyMatch
      parts.push(indent)
      parts.push(<span key="k" className="text-blue-600">{key}</span>)
      parts.push(<span key="c" className="text-gray-500">{colon}</span>)

      // Colorize the value part
      const trimmedRest = rest
      if (trimmedRest) {
        parts.push(colorizeValue(trimmedRest, `v-${i}`))
      }
    } else if (line.trimStart().startsWith('-')) {
      // Array item without a key
      const dashMatch = line.match(/^(\s*)(-)(.*)$/)
      if (dashMatch) {
        const [, indent, dash, rest] = dashMatch
        parts.push(indent)
        parts.push(<span key="d" className="text-gray-500">{dash}</span>)
        if (rest) parts.push(colorizeValue(rest, `a-${i}`))
      } else {
        parts.push(line)
      }
    } else {
      parts.push(line)
    }

    return <div key={i}>{parts}{'\n'}</div>
  })
}

function colorizeValue(value: string, keyPrefix: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = value
  let idx = 0

  while (remaining.length > 0) {
    // Quoted string
    const strMatch = remaining.match(/^([^"]*)"([^"]*)"/)
    if (strMatch) {
      if (strMatch[1]) parts.push(colorizeTokens(strMatch[1], `${keyPrefix}-${idx++}`))
      parts.push(<span key={`${keyPrefix}-s-${idx++}`} className="text-green-600">"{strMatch[2]}"</span>)
      remaining = remaining.slice(strMatch[0].length)
      continue
    }
    // No more strings — colorize rest as tokens
    parts.push(colorizeTokens(remaining, `${keyPrefix}-${idx++}`))
    break
  }

  return <>{parts}</>
}

function colorizeTokens(text: string, key: string): React.ReactNode {
  // Colorize numbers and brackets
  return text.split(/(\d+|[\[\],])/).map((part, i) => {
    if (/^\d+$/.test(part)) {
      return <span key={`${key}-${i}`} className="text-orange-500">{part}</span>
    }
    if (/^[\[\],]$/.test(part)) {
      return <span key={`${key}-${i}`} className="text-gray-500">{part}</span>
    }
    return part
  })
}

export function YamlModal({
  cheatsheet,
  onClose,
}: {
  cheatsheet: Cheatsheet
  onClose: () => void
}) {
  const { isHidden } = useHiddenEntries()
  const [copied, setCopied] = useState(false)
  const yaml = generateYaml(cheatsheet, isHidden)

  function handleCopy() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="relative mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">YAML Source (visible entries)</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed text-gray-800">
          {colorizeYaml(yaml)}
        </pre>
      </div>
    </div>
  )
}
