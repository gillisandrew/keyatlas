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
          {yaml}
        </pre>
      </div>
    </div>
  )
}
