import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ClerkProvider, useAuth } from '@clerk/tanstack-start'

export function createRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    throw new Error('missing VITE_CONVEX_URL envar')
  }
  const convex = new ConvexReactClient(CONVEX_URL, {
    unsavedChangesWarning: false,
  })
  const convexQueryClient = new ConvexQueryClient(convex)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
  })
  convexQueryClient.connect(queryClient)

  // getting Warning: useRouter must be used inside a <RouterProvider> compon
  // maybe that's a monorepo thing...
  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: 'intent',
      defaultErrorComponent: DefaultCatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,
      context: { queryClient, convexClient: convex },
      Wrap: ({ children }) => {
        // Since this wraps the router, it can't use the router!
        // The reason ConvexProvider goes outside the wrapper is so
        // Convex hooks work? Or what?
        // Wait why do we put ConvexProvider here at all,
        // if we only need to for Convex-specific hooks?
        return (
          <ConvexProvider client={convexQueryClient.convexClient}>
            {children}
          </ConvexProvider>
        )
      },
      // ClerkProvider can't be used here, either!
      // It expects to be in a route I think.
      // "Error in renderToPipeableStream: Error: Invariant failed: Could not find a nearst match!"
      InnerWrap: ({ children }) => <>{children}</>,
    }),
    queryClient,
  )

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
