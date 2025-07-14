import { useEffect } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select'
import { useModelStore } from '../stores/modelStore'

export function ModelSelect() {
  const {
    selectedModel,
    providers,
    isLoadingProviders,
    error,
    setSelectedModel,
    fetchProviders
  } = useModelStore()

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const getSelectedModelName = (modelKey: string): string => {
    if (!providers) return modelKey

    for (const provider of providers.providers) {
      const model = provider.models[modelKey]
      if (model) {
        return `${model.name} (${provider.name})`
      }
    }
    return modelKey
  }

  if (isLoadingProviders) {
    return (
      <Select disabled>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Loading models..." />
        </SelectTrigger>
      </Select>
    )
  }

  if (error || !providers) {
    return (
      <Select disabled>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Error loading models" />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={selectedModel} onValueChange={setSelectedModel}>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a model">
          {selectedModel ? getSelectedModelName(selectedModel) : 'Select a model'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {providers.providers.map((provider) => (
          <SelectGroup key={provider.id}>
            <SelectLabel>{provider.name}</SelectLabel>
            {Object.entries(provider.models).map(([modelKey, model]) => (
              <SelectItem key={modelKey} value={modelKey}>
                {model.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
