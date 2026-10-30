import type { GlobeLocale } from "../globe/types/data"
import { t } from "../i18n/globe"

interface GlobeGuideProps {
  locale: GlobeLocale
}

export function GlobeGuide({ locale }: GlobeGuideProps) {
  return (
    <div className="globe-guide">
      <span>{t(locale, "dragToRotate")}</span>
      <span>{t(locale, "wheelToZoom")}</span>
      <span>{t(locale, "selectToFocus")}</span>
    </div>
  )
}
