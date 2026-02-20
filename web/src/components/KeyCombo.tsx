import { isChord, type KeysField, type KeyCombo as KeyComboType } from '@/data/types'

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium text-gray-700 shadow-sm">
      {children}
    </kbd>
  )
}

function SingleCombo({ keys }: { keys: KeyComboType }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {keys.map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  )
}

export function KeyCombo({
  keys,
  range,
  altKeys,
}: {
  keys: KeysField
  range?: KeyComboType
  altKeys?: KeyComboType
}) {
  const main = isChord(keys) ? (
    <span className="inline-flex items-center gap-1">
      {keys.map((combo, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-gray-400">,</span>}
          <SingleCombo keys={combo} />
        </span>
      ))}
    </span>
  ) : (
    <SingleCombo keys={keys} />
  )

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {main}
      {range && (
        <span className="text-xs text-gray-400">
          –<Kbd>{range[0]}</Kbd>
        </span>
      )}
      {altKeys && (
        <>
          <span className="text-xs text-gray-400">/</span>
          <SingleCombo keys={altKeys} />
        </>
      )}
    </span>
  )
}
