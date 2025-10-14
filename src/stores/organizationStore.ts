// T034: Organization store (Zustand)
// Multi-org context management per research.md section 4

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OrganizationStore {
  activeOrgId: string | null
  setActiveOrg: (orgId: string) => void
  clearActiveOrg: () => void
}

/**
 * Zustand store for active organization context
 * Persisted to localStorage for cross-session consistency
 * Used for multi-org users to track which org they're currently viewing
 */
export const useOrganizationStore = create<OrganizationStore>()(
  persist(
    (set) => ({
      activeOrgId: null,

      setActiveOrg: (orgId: string) => {
        set({ activeOrgId: orgId })
      },

      clearActiveOrg: () => {
        set({ activeOrgId: null })
      },
    }),
    {
      name: 'pipetrak:activeOrgId', // localStorage key
    }
  )
)
