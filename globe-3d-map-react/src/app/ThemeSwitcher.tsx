import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface ThemeItem {
  readonly id: string
  readonly label: string
  readonly swatch: string
}

interface ThemeSwitcherProps {
  themes: readonly ThemeItem[]
  current: string
  accent: string
  locale: GlobeLocale
  onSelect: (themeId: string) => void
  onSelectCustom: (color: string) => void
}

export function ThemeSwitcher({
  themes,
  current,
  accent,
  locale,
  onSelect,
  onSelectCustom,
}: ThemeSwitcherProps) {
  return (
    <aside className="theme-switcher" aria-label={t(locale, "colorSystem")}>
      <span className="theme-switcher__label">{t(locale, "colorSystem")}</span>
      <div className="theme-switcher__options">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-switcher__button${
              current === theme.id ? " is-active" : ""
            }`}
            style={{ "--theme-swatch": theme.swatch } as React.CSSProperties}
            aria-label={theme.label}
            aria-pressed={current === theme.id}
            title={theme.label}
            onClick={() => onSelect(theme.id)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
        <label className="theme-switcher__picker" title={t(locale, "customColor")}>
          <input
            type="color"
            value={accent}
            aria-label={t(locale, "customColor")}
            onChange={(event) => onSelectCustom(event.target.value)}
          />
          <span aria-hidden="true">+</span>
        </label>
      </div>
    </aside>
  )
}
