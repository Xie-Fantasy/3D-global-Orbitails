import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface TextureMode {
  readonly id: string
  readonly label: string
  readonly caption: string
}

interface TextureSwitcherProps {
  modes: readonly TextureMode[]
  current: string
  disabled?: boolean
  locale: GlobeLocale
  onSelect: (modeId: string) => void
}

export function TextureSwitcher({
  modes,
  current,
  disabled = false,
  locale,
  onSelect,
}: TextureSwitcherProps) {
  return (
    <aside className="texture-switcher" aria-label={t(locale, "earthSurface")}>
      <span className="texture-switcher__label">{t(locale, "earthSurface")}</span>
      <div className="texture-switcher__options">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={current === mode.id ? "is-active" : undefined}
            aria-pressed={current === mode.id}
            disabled={disabled}
            onClick={() => onSelect(mode.id)}
          >
            <span>{mode.label}</span>
            <small>{mode.caption}</small>
          </button>
        ))}
      </div>
    </aside>
  )
}
