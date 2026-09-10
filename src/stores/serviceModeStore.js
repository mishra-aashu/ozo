import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useServiceModeStore = create(
  persist(
    (set, get) => ({
      currentMode: 'mart', // 'mart' | 'services'
      hasSeenOnboarding: false,

      setMode: (mode) => {
        set({ currentMode: mode })
      },

      setHasSeenOnboarding: (seen) => {
        set({ hasSeenOnboarding: seen })
      },

      toggleMode: () => {
        const nextMode = get().currentMode === 'mart' ? 'services' : 'mart'
        set({ currentMode: nextMode })
      },
    }),
    {
      name: 'ozo_service_mode',
    }
  )
)
