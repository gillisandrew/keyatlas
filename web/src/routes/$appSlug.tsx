import { createFileRoute, notFound } from '@tanstack/react-router'
import { getCheatsheet } from '@/data/cheatsheets'
import { AppSidebar } from '@/components/AppSidebar'
import { CheatsheetView } from '@/components/CheatsheetView'

export const Route = createFileRoute('/$appSlug')({
  component: CheatsheetPage,
  loader: ({ params }) => {
    const cheatsheet = getCheatsheet(params.appSlug)
    if (!cheatsheet) throw notFound()
    return { cheatsheet }
  },
})

function CheatsheetPage() {
  const { cheatsheet } = Route.useLoaderData()
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-8">
        <CheatsheetView cheatsheet={cheatsheet} />
      </main>
    </div>
  )
}
