interface GlobeLoadingProps {
  message: string
  progress: number
  leaving?: boolean
}

export function GlobeLoading({ message, progress, leaving = false }: GlobeLoadingProps) {
  const clamped = Math.max(0, Math.min(1, progress))
  const percent = String(Math.round(clamped * 100)).padStart(2, "0")

  return (
    <div
      className={`globe-loading${leaving ? " globe-loading--leave" : ""}`}
      role="status"
      aria-live="polite"
    >
      <p className="globe-loading__eyebrow">GLOBAL ORBIT / INITIALIZING</p>
      <strong>{message}</strong>
      <div
        className="globe-loading__progress"
        role="progressbar"
        aria-label="地球资源加载进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped * 100)}
      >
        <i style={{ transform: `scaleX(${clamped})` }} />
      </div>
      <span className="globe-loading__value">{percent}%</span>
    </div>
  )
}
