import type { RefObject } from "react"
import type { GlobeState } from "../globe/types/state"
import type { GlobeStatus } from "../hooks/useGlobeWorld"

interface GlobeCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  state: GlobeState | null
  status: GlobeStatus
}

export function GlobeCanvas({ canvasRef, state, status }: GlobeCanvasProps) {
  const showError = status === "error" || state?.phase === "fatal-error"

  return (
    <div className="globe-stage">
      <canvas
        ref={canvasRef}
        className="globe-stage__canvas"
        aria-label="Interactive 3D globe"
      >
        Your browser cannot display this WebGL 3D globe.
      </canvas>
      {state?.layerIssues && state.layerIssues.length > 0 ? (
        <div className="globe-issue-tray">
          {state.layerIssues.map((issue) => (
            <span key={issue.id} className="globe-issue-tray__item">
              {issue.message}
            </span>
          ))}
        </div>
      ) : null}

      {showError ? (
        <div className="globe-overlay globe-overlay--error" role="alert">
          <p className="globe-overlay__title">Unable to start 3D globe</p>
          {state?.error ? (
            <span className="globe-overlay__detail">{state.error.message}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
