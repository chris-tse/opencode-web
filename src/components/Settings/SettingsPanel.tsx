import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ModelSelect } from '../ModelSelect'
import { MODE_LABELS } from '../../utils/constants'

interface SettingsPanelProps {
  selectedMode: string
  onModeChange: (mode: string) => void
}

export const SettingsPanel = ({ selectedMode, onModeChange }: SettingsPanelProps) => {
  return (
    <div className="flex gap-4 items-center">
      <div className="flex gap-2 items-center">
        <label htmlFor="mode-select" className="text-sm font-medium">Mode:</label>
        <Select value={selectedMode} onValueChange={onModeChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 items-center">
        <label htmlFor="model-select" className="text-sm font-medium">Model:</label>
        <ModelSelect 
        />
      </div>
    </div>
  )
}
