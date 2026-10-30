import type { LonLat } from "../globe/types/data"

interface GlobeCoordinateProps {
  coordinate: LonLat
}

export function GlobeCoordinate({ coordinate }: GlobeCoordinateProps) {
  const [longitude, latitude] = coordinate
  const latLabel = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}`
  const lonLabel = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`

  return (
    <div className="globe-coordinate">
      <span>{latLabel}</span>
      <i aria-hidden="true" />
      <span>{lonLabel}</span>
    </div>
  )
}
