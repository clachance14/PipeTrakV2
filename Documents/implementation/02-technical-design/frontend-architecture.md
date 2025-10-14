6. FRONTEND ARCHITECTURE

6.1 Application Structure

src/
├── main.tsx                    # Entry point, Supabase init
├── App.tsx                     # Root component, routing
├── routes/                     # Route components
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   ├── projects/
│   │   ├── ProjectListPage.tsx
│   │   ├── ProjectDetailPage.tsx
│   │   └── components/
│   │       ├── ComponentsTable.tsx         # Virtualized table
│   │       ├── MilestoneButton.tsx
│   │       ├── BulkUpdateModal.tsx
│   │       └── ComponentSearch.tsx
│   ├── packages/
│   │   ├── PackageReadinessPage.tsx
│   │   └── components/
│   │       └── PackageCard.tsx
│   ├── needs-review/
│   │   ├── NeedsReviewPage.tsx
│   │   └── components/
│   │       ├── ReviewItem.tsx
│   │       └── ResolveModal.tsx
│   ├── welders/
│   │   ├── WelderDirectoryPage.tsx
│   │   └── components/
│   │       ├── WelderList.tsx
│   │       └── MergeWeldersModal.tsx
│   └── imports/
│       ├── ImportPage.tsx
│       └── components/
│           ├── FileUpload.tsx
│           └── ErrorReport.tsx
├── components/                 # Shared UI components
│   ├── ui/                     # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── Layout.tsx
│   ├── Navbar.tsx
│   └── WorkNotSavedBanner.tsx
├── lib/
│   ├── supabase.ts             # Supabase client init
│   ├── auth.ts                 # Auth helpers
│   └── utils.ts                # Utility functions
├── hooks/
│   ├── useComponents.ts        # TanStack Query hooks
│   ├── usePackages.ts
│   ├── useNeedsReview.ts
│   ├── useRealtime.ts          # Realtime subscription hook
│   └── useOfflineDetection.ts
├── stores/
│   ├── authStore.ts            # Zustand: user, capabilities
│   ├── uiStore.ts              # Zustand: selected components, filters
│   └── retryQueueStore.ts      # Zustand: offline retry queue
├── types/
│   ├── database.types.ts       # Generated from Supabase schema
│   └── domain.types.ts         # Domain models
└── utils/
    ├── rocCalculator.ts        # Client-side ROC validation
    ├── drawingNormalizer.ts    # Client-side normalization preview
    └── validators.ts           # Form validation schemas (Zod)

6.2 Key Frontend Features

──────────────────────────────────────────────────────────────────────────────
FEATURE: Virtualized Components Table
──────────────────────────────────────────────────────────────────────────────

Technology: TanStack Virtual

<ComponentsTable.tsx>

import { useVirtualizer } from '@tanstack/react-virtual'
import { useComponents } from '@/hooks/useComponents'

export function ComponentsTable({ projectId, drawingId }) {
  const { data: components } = useComponents({ projectId, drawingId })
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: components?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48, // Row height in pixels
    overscan: 10 // Render 10 extra rows above/below viewport
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const component = components[virtualRow.index]
          return (
            <ComponentRow
              key={component.id}
              component={component}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

Performance:
- Renders only ~30 visible rows (vs 10k total)
- Smooth 60fps scrolling
- Memory usage: ~50MB for 10k components (vs ~500MB without virtualization)

──────────────────────────────────────────────────────────────────────────────
FEATURE: Bulk Update with Intersection Logic
──────────────────────────────────────────────────────────────────────────────

<BulkUpdateModal.tsx>

export function BulkUpdateModal({ selectedComponentIds, onClose }) {
  const { data: components } = useComponents({ ids: selectedComponentIds })

  // Calculate shared milestones
  const sharedMilestones = useMemo(() => {
    if (!components) return []

    const milestonesByType = components.map(c => {
      const template = getTemplate(c.component_type)
      return new Set(template.milestones_config.map(m => m.name))
    })

    // Intersection: only milestones present in ALL component types
    return Array.from(milestonesByType[0]).filter(milestone =>
      milestonesByType.every(set => set.has(milestone))
    )
  }, [components])

  const updateMutation = useMutation({
    mutationFn: (data) => bulkUpdateMilestones(data),
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated}, skipped ${result.skipped}, flagged ${result.flagged}`)
      onClose()
    }
  })

  if (sharedMilestones.length === 0) {
    return <p>No shared milestones for selected items.</p>
  }

  return (
    <Dialog>
      <DialogTitle>Bulk Update {selectedComponentIds.length} Components</DialogTitle>
      <Select onChange={setMilestone}>
        {sharedMilestones.map(m => <option key={m}>{m}</option>)}
      </Select>
      {selectedComponentIds.length > 10 && (
        <Alert>Confirm: Mark {milestone} complete for {selectedComponentIds.length} components?</Alert>
      )}
      <Button onClick={() => updateMutation.mutate({ componentIds: selectedComponentIds, milestone })}>
        Apply
      </Button>
    </Dialog>
  )
}

──────────────────────────────────────────────────────────────────────────────
FEATURE: Real-time Sync (Supabase Realtime)
──────────────────────────────────────────────────────────────────────────────

<useRealtime.ts>

export function useRealtimeComponents(projectId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'components',
        filter: `project_id=eq.${projectId}`
      }, payload => {
        // Optimistic update: merge new data into cache
        queryClient.setQueryData(['components', projectId], (old) => {
          if (payload.eventType === 'UPDATE') {
            return old.map(c => c.id === payload.new.id ? payload.new : c)
          }
          if (payload.eventType === 'INSERT') {
            return [...old, payload.new]
          }
          return old
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
}

Fallback polling (if WebSocket disconnects):

const { data } = useQuery({
  queryKey: ['components', projectId],
  queryFn: () => fetchComponents(projectId),
  refetchInterval: 30000, // Poll every 30s
  refetchIntervalInBackground: false
})

──────────────────────────────────────────────────────────────────────────────
FEATURE: 2-Second Undo Window
──────────────────────────────────────────────────────────────────────────────

<MilestoneButton.tsx>

export function MilestoneButton({ component, milestone }) {
  const [showUndo, setShowUndo] = useState(false)
  const undoTimeoutRef = useRef<NodeJS.Timeout>()

  const updateMutation = useMutation({
    mutationFn: (data) => updateMilestone(data),
    onSuccess: () => {
      setShowUndo(true)
      undoTimeoutRef.current = setTimeout(() => {
        setShowUndo(false)
      }, 2000)
    }
  })

  const handleUndo = () => {
    clearTimeout(undoTimeoutRef.current)
    setShowUndo(false)
    // Revert to previous state
    updateMutation.mutate({
      componentId: component.id,
      milestone: milestone.name,
      value: !component.current_milestones[milestone.name]
    })
  }

  return (
    <div>
      <Button onClick={() => updateMutation.mutate({ componentId: component.id, milestone: milestone.name })}>
        {component.current_milestones[milestone.name] ? '✓' : ' '}
      </Button>
      {showUndo && (
        <Button variant="ghost" onClick={handleUndo}>
          Undo (2s)
        </Button>
      )}
    </div>
  )
}

6.3 Mobile PWA Configuration

<vite.config.ts>

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'PipeTrak',
        short_name: 'PipeTrak',
        description: 'Piping progress tracking for industrial construction',
        theme_color: '#1e40af',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://YOUR_SUPABASE_URL',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ]
})

Benefits:
- Install to home screen (iOS/Android)
- Offline detection via service worker
- App-like experience (no browser chrome)

═══════════════════════════════════════════════════════════════════════════════
