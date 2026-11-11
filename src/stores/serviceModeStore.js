import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useServiceModeStore = create(
  persist(
    (set, get) => ({
      currentMode: 'mart', // 'mart' | 'services' | 'care'
      hasSeenOnboarding: false,

      setMode: (mode) => {
        set({ currentMode: mode })
      },

      setHasSeenOnboarding: (seen) => {
        set({ hasSeenOnboarding: seen })
      },

      toggleMode: () => {
        const modes = ['mart', 'services', 'care']
        const nextIdx = (modes.indexOf(get().currentMode) + 1) % modes.length
        set({ currentMode: modes[nextIdx] })
      },
    }),
    {
      name: 'ozo_service_mode',
    }
  )
)
