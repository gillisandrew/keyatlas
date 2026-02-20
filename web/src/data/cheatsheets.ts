import type { Cheatsheet, CheatsheetData } from './types'

import ghostty from '../../../data/ghostty.yaml'
import macosEssentials from '../../../data/macos-essentials.yaml'
import macosScreenshots from '../../../data/macos-screenshots.yaml'
import macosTextEditing from '../../../data/macos-text-editing.yaml'
import macosWindowManagement from '../../../data/macos-window-management.yaml'
import vscodeEditing from '../../../data/vscode-editing.yaml'
import vscodeGeneral from '../../../data/vscode-general.yaml'
import vscodeNavigation from '../../../data/vscode-navigation.yaml'

const raw: [string, CheatsheetData][] = [
  ['ghostty', ghostty as unknown as CheatsheetData],
  ['macos-essentials', macosEssentials as unknown as CheatsheetData],
  ['macos-screenshots', macosScreenshots as unknown as CheatsheetData],
  ['macos-text-editing', macosTextEditing as unknown as CheatsheetData],
  ['macos-window-management', macosWindowManagement as unknown as CheatsheetData],
  ['vscode-editing', vscodeEditing as unknown as CheatsheetData],
  ['vscode-general', vscodeGeneral as unknown as CheatsheetData],
  ['vscode-navigation', vscodeNavigation as unknown as CheatsheetData],
]

export const cheatsheets: Cheatsheet[] = raw.map(([slug, data]) => ({
  ...data,
  slug,
}))

export function getCheatsheet(slug: string): Cheatsheet | undefined {
  return cheatsheets.find((c) => c.slug === slug)
}
