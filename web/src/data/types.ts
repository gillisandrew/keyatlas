export type KeyCombo = string[]

export type KeysField = KeyCombo | KeyCombo[]

export interface Entry {
  keys: KeysField
  win_keys?: KeysField
  alt_keys?: KeyCombo
  range?: KeyCombo
  action: string
}

export interface Section {
  name: string
  entries: Entry[]
}

export interface CheatsheetData {
  app: string
  subtitle?: string
  paper?: string
  columns?: number
  color?: string
  font_scale?: number
  orientation?: 'landscape' | 'portrait'
  sections: Section[]
}

export interface Cheatsheet extends CheatsheetData {
  slug: string
}

/** Type guard: is this a chord (array of arrays)? */
export function isChord(keys: KeysField): keys is KeyCombo[] {
  return Array.isArray(keys[0])
}
