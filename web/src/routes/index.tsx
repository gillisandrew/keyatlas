import { createFileRoute } from '@tanstack/react-router'
import { cheatsheets } from '@/data/cheatsheets'
import { AppGrid } from '@/components/AppGrid'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">KeyAtlas</h1>
      <p className="mb-8 text-gray-500">Keyboard shortcut cheatsheets</p>
      <AppGrid cheatsheets={cheatsheets} />
    </div>
  )
}
