import { Sun, Moon, Monitor } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'

interface Props {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export function ThemeSwitcher({ theme, setTheme }: Props) {
  const options: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Světlý' },
    { value: 'dim', icon: Monitor, label: 'Tlumený' },
    { value: 'dark', icon: Moon, label: 'Tmavý' },
  ]

  return (
    <div className="flex items-center rounded-lg border border-theme-border overflow-hidden">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`p-1.5 transition-colors ${theme === value ? 'bg-blue-600 text-white' : 'text-theme-secondary hover:bg-theme-hover'}`}
          title={label}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
