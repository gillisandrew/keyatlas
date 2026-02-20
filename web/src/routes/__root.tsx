import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { HiddenEntriesProvider } from '@/context/HiddenEntriesContext'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'KeyAtlas' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <HiddenEntriesProvider>
          {children}
        </HiddenEntriesProvider>
        <Scripts />
      </body>
    </html>
  )
}
