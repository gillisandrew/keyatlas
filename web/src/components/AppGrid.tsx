import type { Cheatsheet } from '@/data/types'
import { AppCard } from './AppCard'

export function AppGrid({ cheatsheets }: { cheatsheets: Cheatsheet[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cheatsheets.map((cs) => (
        <AppCard key={cs.slug} cheatsheet={cs} />
      ))}
    </div>
  )
}
