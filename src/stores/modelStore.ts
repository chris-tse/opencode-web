import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getProviders } from '../services/api'
import { DEFAULT_SETTINGS } from '../utils/constants'
import type { ProvidersResponse } from '../services/types'

interface ModelState {
  selectedModel: string
  providers: ProvidersResponse | null
  isLoadingProviders: boolean
  error: string | null
  
  // Actions
  setSelectedModel: (modelId: string) => void
  fetchProviders: () => Promise<void>
  getProviderForModel: (modelId: string) => string
  clearError: () => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModel: DEFAULT_SETTINGS.MODEL,
      providers: null,
      isLoadingProviders: false,
      error: null,

      setSelectedModel: (modelId: string) => {
        set({ selectedModel: modelId })
      },

      fetchProviders: async () => {
        const { providers, isLoadingProviders } = get()
        
        // Don't fetch if already loading or already have data
        if (isLoadingProviders || providers) {
          return
        }

        set({ isLoadingProviders: true, error: null })

        try {
          const data = await getProviders()
          set({ providers: data, isLoadingProviders: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          set({ 
            error: `Failed to load models - ${errorMessage}`, 
            isLoadingProviders: false 
          })
        }
      },

      getProviderForModel: (modelId: string): string => {
        const { providers } = get()
        
        if (!providers) return DEFAULT_SETTINGS.PROVIDER
        
        for (const provider of providers.providers) {
          if (provider.models[modelId]) {
            return provider.id
          }
        }
        return DEFAULT_SETTINGS.PROVIDER
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'opencode-model-selection',
      partialize: (state) => ({
        selectedModel: state.selectedModel
      })
    }
  )
)