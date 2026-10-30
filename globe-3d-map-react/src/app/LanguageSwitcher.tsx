import type { GlobeLocale } from "../globe/types/data"

interface LanguageSwitcherProps {
  current: GlobeLocale
  onSelect: (locale: GlobeLocale) => void
}

export function LanguageSwitcher({ current, onSelect }: LanguageSwitcherProps) {
  return (
    <aside className="language-switcher" aria-label="LANGUAGE">
      <span className="language-switcher__label">LANGUAGE</span>
      <div>
        <button
          type="button"
          className={current === "en" ? "is-active" : undefined}
          aria-pressed={current === "en"}
          onClick={() => onSelect("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={current === "zh" ? "is-active" : undefined}
          aria-pressed={current === "zh"}
          onClick={() => onSelect("zh")}
        >
          中文
        </button>
      </div>
    </aside>
  )
}
