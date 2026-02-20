import { Link, useParams } from '@tanstack/react-router'
import { cheatsheets } from '@/data/cheatsheets'

export function AppSidebar() {
  const { appSlug } = useParams({ strict: false })

  return (
    <nav className="sidebar w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="p-4">
        <Link to="/" className="text-lg font-bold text-gray-900 hover:underline">
          KeyAtlas
        </Link>
      </div>
      <ul className="space-y-0.5 px-2 pb-4">
        {cheatsheets.map((cs) => {
          const active = cs.slug === appSlug
          return (
            <li key={cs.slug}>
              <Link
                to="/$appSlug"
                params={{ appSlug: cs.slug }}
                className={`block rounded px-3 py-1.5 text-sm ${
                  active
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {cs.app}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
