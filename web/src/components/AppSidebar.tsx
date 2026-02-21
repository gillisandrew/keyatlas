import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cheatsheets } from '@/data/cheatsheets'
import type { Cheatsheet } from '@/data/types'

interface AppGroup {
  app: string
  items: Cheatsheet[]
}

const groups: AppGroup[] = (() => {
  const map = new Map<string, Cheatsheet[]>()
  for (const cs of cheatsheets) {
    const list = map.get(cs.app) ?? []
    list.push(cs)
    map.set(cs.app, list)
  }
  return Array.from(map, ([app, items]) => ({ app, items }))
})()

export function AppSidebar({
  open = true,
  onToggle,
}: {
  open?: boolean
  onToggle?: () => void
}) {
  const { appSlug } = useParams({ strict: false })

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('keyatlas:sidebar-collapsed')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  function toggleGroup(app: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [app]: !prev[app] }
      localStorage.setItem('keyatlas:sidebar-collapsed', JSON.stringify(next))
      return next
    })
  }

  if (!open) {
    return (
      <div className="sidebar shrink-0">
        <button
          onClick={onToggle}
          className="m-2 rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Open sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    )
  }

  return (
    <nav className="sidebar w-56 shrink-0 border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between p-4">
        <Link to="/" className="text-lg font-bold text-gray-900 hover:underline">
          KeyAtlas
        </Link>
        <button
          onClick={onToggle}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Close sidebar"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <ul className="space-y-1 px-2 pb-4">
        {groups.map((group) => {
          if (group.items.length === 1) {
            const cs = group.items[0]
            const active = cs.slug === appSlug
            return (
              <li key={cs.slug}>
                <Link
                  to="/$appSlug"
                  params={{ appSlug: cs.slug }}
                  className={`block rounded py-1.5 pl-8 pr-3 text-sm font-medium ${
                    active
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {cs.app}
                </Link>
              </li>
            )
          }

          const isActive = group.items.some((cs) => cs.slug === appSlug)
          const isCollapsed = collapsed[group.app] && !isActive

          return (
            <li key={group.app}>
              <button
                onClick={() => toggleGroup(group.app)}
                className="flex w-full items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                {isCollapsed ? (
                  <ChevronRight size={14} className="shrink-0 text-gray-400" />
                ) : (
                  <ChevronDown size={14} className="shrink-0 text-gray-400" />
                )}
                {group.app}
              </button>
              {!isCollapsed && (
                <ul className="mt-0.5 space-y-0.5">
                  {group.items.map((cs) => {
                    const active = cs.slug === appSlug
                    return (
                      <li key={cs.slug}>
                        <Link
                          to="/$appSlug"
                          params={{ appSlug: cs.slug }}
                          className={`block rounded py-1 pl-8 pr-3 text-sm ${
                            active
                              ? 'bg-gray-100 font-medium text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {cs.shortname ?? cs.app}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
