import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', newTheme === 'dark')
        return { theme: newTheme }
      }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
      initTheme: () => {
        const savedTheme = localStorage.getItem('ozo-theme-storage')
        let currentTheme = 'light'
        if (savedTheme) {
          try {
            const parsed = JSON.parse(savedTheme)
            if (parsed && parsed.state && parsed.state.theme) {
              currentTheme = parsed.state.theme
            }
          } catch (e) {
            console.error(e)
          }
        }
        document.documentElement.classList.toggle('dark', currentTheme === 'dark')
        set({ theme: currentTheme })
      }
    }),
    {
      name: 'ozo-theme-storage',
    }
  )
)
