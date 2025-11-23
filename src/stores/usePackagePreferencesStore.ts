import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PackagePreferencesStore {
  viewMode: 'cards' | 'list'
  setViewMode: (mode: 'cards' | 'list') => void
}

export const usePackagePreferencesStore = create<PackagePreferencesStore>()(
  persist(
    (set) => ({
      viewMode: 'cards', // default
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'pipetrak:package-preferences',
    }
  )
)
