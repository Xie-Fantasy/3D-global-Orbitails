import { MOUSE, PerspectiveCamera, Raycaster, Vector2, Vector3 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { gsap } from "gsap"
import { CAMERA_CONFIG, EARTH_RADIUS, VIEW_PRESETS } from "../config/globe.config.js"
import { lonLatToVector3, slerpUnitVectors } from "../math/geo.js"

const ORIGIN = new Vector3()

export class GlobeCameraController {
  constructor(canvas, aspect, options = {}) {
    this.canvas = canvas
    this.onPresetChange = options.onPresetChange
    this.onInteractionChange = options.onInteractionChange
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    this.resumeTimer = null
    this.zoomEndTimer = null
    this.focusTween = null
    this.introTween = null
    this.autoRotateLocked = false
    this.autoRotateEnabled = true
    this.aspect = aspect
    this.zoomTargetDistance = null
    this.zoomRaycaster = new Raycaster()
    this.zoomPointer = new Vector2()
    this.zoomAnchor = new Vector3()
    this.zoomTargetDirection = new Vector3()
    this.zoomCurrentDirection = new Vector3()
    this.zoomDirectionStrength = 0

    this.camera = new PerspectiveCamera(
      CAMERA_CONFIG.fieldOfView,
      aspect,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    )
    this.controls = new OrbitControls(this.camera, canvas)
    this.configureControls()
    this.applyPreset(VIEW_PRESETS.global, true)
  }

  configureControls() {
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.enablePan = true
    this.controls.screenSpacePanning = true
    this.controls.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    }
    this.controls.rotateSpeed = 0.52
    this.controls.enableZoom = false
    this.controls.minDistance = CAMERA_CONFIG.minDistance
    this.controls.maxDistance = this.getMaxDistance()
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = CAMERA_CONFIG.autoRotateSpeed
    this.controls.target.copy(ORIGIN)

    this.handleStart = () => {
      window.clearTimeout(this.resumeTimer)
      window.clearTimeout(this.zoomEndTimer)
      this.zoomTargetDistance = null
      this.zoomDirectionStrength = 0
      this.focusTween?.kill()
      this.focusTween = null
      this.controls.autoRotate = false
      this.onPresetChange?.("custom")
      this.onInteractionChange?.(true)
    }

    this.handleEnd = () => {
      this.onInteractionChange?.(false)
      this.scheduleAutoRotate()
    }

    this.controls.addEventListener("start", this.handleStart)
    this.controls.addEventListener("end", this.handleEnd)

    this.handleWheel = (event) => {
      if (!this.controls.enabled || this.reducedMotion) {
        return
      }
      event.preventDefault()
      window.clearTimeout(this.resumeTimer)
      window.clearTimeout(this.zoomEndTimer)
      this.focusTween?.kill()
      this.focusTween = null
      this.controls.autoRotate = false
      const currentDistance = this.zoomTargetDistance ?? this.camera.position.length()
      const delta = Math.max(-160, Math.min(160, event.deltaY))
      const multiplier = Math.exp(delta * 0.00175)
      this.zoomTargetDistance = Math.max(
        this.controls.minDistance,
        Math.min(this.controls.maxDistance, currentDistance * multiplier)
      )

      // Follow the surface point under the cursor with a subtle orbital turn.
      // The distance remains damped below, while this direction gives zooming
      // the same grounded, map-like motion as a globe application.
      const bounds = this.canvas.getBoundingClientRect()
      if (bounds.width > 0 && bounds.height > 0) {
        this.zoomPointer.set(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1
        )
        this.zoomRaycaster.setFromCamera(this.zoomPointer, this.camera)
        const rayOrigin = this.zoomRaycaster.ray.origin
        const rayDirection = this.zoomRaycaster.ray.direction
        const projection = rayOrigin.dot(rayDirection)
        const discriminant = projection * projection - (rayOrigin.lengthSq() - EARTH_RADIUS * EARTH_RADIUS)
        if (discriminant > 0) {
          const distanceToSurface = -projection - Math.sqrt(discriminant)
          if (distanceToSurface > 0) {
            this.zoomAnchor.copy(rayDirection).multiplyScalar(distanceToSurface).add(rayOrigin)
            this.zoomTargetDirection.copy(this.zoomAnchor).normalize()
            this.zoomDirectionStrength = Math.min(
              0.16,
              this.zoomDirectionStrength + (delta < 0 ? 0.085 : 0.025)
            )
          }
        }
      }
      this.onPresetChange?.("custom")
      this.onInteractionChange?.(true)
      this.zoomEndTimer = window.setTimeout(() => {
        this.onInteractionChange?.(false)
        this.scheduleAutoRotate()
      }, 160)
    }
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false, capture: true })
  }

  applyPreset(preset, immediate = false, lockAutoRotate = false, duration = 1.35) {
    if (!preset) {
      return
    }

    window.clearTimeout(this.resumeTimer)
    window.clearTimeout(this.zoomEndTimer)
    this.zoomTargetDistance = null
    this.zoomDirectionStrength = 0
    this.focusTween?.kill()
    this.autoRotateLocked = lockAutoRotate
    this.controls.autoRotate = false
    const targetDistance = this.getPresetDistance(preset.distance)
    const targetPosition = lonLatToVector3(preset.coordinate, targetDistance)

    if (immediate || this.reducedMotion) {
      this.camera.position.copy(targetPosition)
      this.camera.lookAt(ORIGIN)
      this.controls.update()
      this.scheduleAutoRotate()
      return
    }

    // Flush OrbitControls' private damping residue before taking ownership
    // of the camera for a deterministic preset transition.
    this.controls.enableDamping = false
    this.controls.update()
    const startDirection = this.camera.position.clone().normalize()
    const endDirection = targetPosition.clone().normalize()
    const startDistance = this.camera.position.length()
    const animationState = { progress: 0 }
    const currentDirection = new Vector3()

    this.controls.enabled = false
    this.focusTween = gsap.to(animationState, {
      progress: 1,
      duration,
      ease: "power3.inOut",
      onUpdate: () => {
        currentDirection.copy(
          slerpUnitVectors(startDirection, endDirection, animationState.progress)
        )
        const distance = startDistance + (targetDistance - startDistance) * animationState.progress
        this.camera.position.copy(currentDirection.multiplyScalar(distance))
        this.camera.lookAt(ORIGIN)
      },
      onComplete: () => {
        this.camera.position.copy(targetPosition)
        this.camera.lookAt(ORIGIN)
        this.controls.update()
        this.controls.enableDamping = true
        this.controls.enabled = true
        this.scheduleAutoRotate()
        this.focusTween = null
      },
    })
  }

  setAutoRotate(enabled) {
    window.clearTimeout(this.resumeTimer)
    this.autoRotateLocked = false
    this.autoRotateEnabled = Boolean(enabled)
    this.controls.autoRotate = this.autoRotateEnabled && !this.reducedMotion
  }

  resetView() {
    this.autoRotateLocked = false
    this.controls.target.copy(ORIGIN)
    this.controls.enabled = true
    this.applyPreset(VIEW_PRESETS.global, true)
    this.controls.update()
  }

  focusCoordinate(coordinate, distance = 82, duration = 1.45) {
    this.applyPreset(
      {
        id: "custom",
        coordinate,
        distance,
      },
      false,
      true,
      duration
    )
  }

  releaseFocus(immediate = false) {
    this.autoRotateLocked = false
    if (immediate && !this.reducedMotion) {
      window.clearTimeout(this.resumeTimer)
      this.controls.autoRotate = this.autoRotateEnabled
      return
    }
    this.scheduleAutoRotate()
  }

  playIntro(globeRoot) {
    window.clearTimeout(this.resumeTimer)
    this.controls.autoRotate = false
    if (this.reducedMotion) {
      this.releaseFocus(true)
      return Promise.resolve()
    }

    const finalPosition = this.camera.position.clone()
    const direction = finalPosition.clone().normalize()
    const finalDistance = finalPosition.length()
    const cameraState = { distance: finalDistance * 1.48 }
    globeRoot.scale.setScalar(0.56)
    globeRoot.rotation.set(0.13, -0.84, -0.025)
    this.camera.position.copy(direction.clone().multiplyScalar(cameraState.distance))
    this.camera.lookAt(ORIGIN)
    this.controls.enabled = false

    return new Promise((resolve) => {
      const finish = () => {
        this.camera.position.copy(finalPosition)
        this.camera.lookAt(ORIGIN)
        globeRoot.scale.setScalar(1)
        globeRoot.rotation.set(0, 0, 0)
        this.controls.enabled = true
        this.controls.update()
        this.introTween = null
        this.releaseFocus(true)
        resolve()
      }

      this.introTween = gsap
        .timeline({
          onComplete: finish,
          onInterrupt: finish,
        })
        .to(
          cameraState,
          {
            distance: finalDistance,
            duration: 3.9,
            ease: "power4.out",
            onUpdate: () => {
              this.camera.position.copy(
                direction.clone().multiplyScalar(cameraState.distance)
              )
              this.camera.lookAt(ORIGIN)
            },
          },
          0
        )
        .to(
          globeRoot.scale,
          {
            x: 1,
            y: 1,
            z: 1,
            duration: 3.55,
            ease: "power4.out",
          },
          0.12
        )
        .to(
          globeRoot.rotation,
          {
            x: 0,
            y: 0,
            z: 0,
            duration: 4.1,
            ease: "power3.out",
          },
          0
        )
    })
  }

  scheduleAutoRotate() {
    window.clearTimeout(this.resumeTimer)
    this.controls.autoRotate = false
    if (this.autoRotateEnabled && !this.reducedMotion && !this.autoRotateLocked) {
      this.resumeTimer = window.setTimeout(() => {
        this.controls.autoRotate = true
      }, CAMERA_CONFIG.autoRotateResumeDelay)
    }
  }

  getDistanceScale() {
    if (this.aspect >= 1) {
      return 1
    }
    return Math.min(2.15, 1 / Math.max(this.aspect, 0.35))
  }

  getPresetDistance(distance) {
    return distance * this.getDistanceScale()
  }

  getMaxDistance() {
    return CAMERA_CONFIG.maxDistance * this.getDistanceScale()
  }

  resize(aspect) {
    this.aspect = aspect
    this.controls.maxDistance = this.getMaxDistance()
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  update(delta = 1 / 60) {
    if (this.zoomDirectionStrength > 0.0001) {
      this.zoomCurrentDirection.copy(this.camera.position).normalize()
      this.zoomCurrentDirection
        .lerp(
          this.zoomTargetDirection,
          (1 - Math.exp(-14 * delta)) * this.zoomDirectionStrength
        )
        .normalize()
      this.camera.position.copy(
        this.zoomCurrentDirection.multiplyScalar(this.camera.position.length())
      )
      this.zoomDirectionStrength *= Math.exp(-4.4 * delta)
    }
    if (this.zoomTargetDistance !== null) {
      const currentDistance = this.camera.position.length()
      const difference = this.zoomTargetDistance - currentDistance
      if (Math.abs(difference) < 0.02) {
        this.camera.position.setLength(this.zoomTargetDistance)
        this.zoomTargetDistance = null
      } else {
        const smoothing = 1 - Math.exp(-12 * delta)
        this.camera.position.setLength(currentDistance + difference * smoothing)
      }
    }
    this.controls.update()
  }

  dispose() {
    window.clearTimeout(this.resumeTimer)
    window.clearTimeout(this.zoomEndTimer)
    this.focusTween?.kill()
    this.introTween?.kill()
    this.controls.removeEventListener("start", this.handleStart)
    this.controls.removeEventListener("end", this.handleEnd)
    this.canvas.removeEventListener("wheel", this.handleWheel, true)
    this.controls.dispose()
  }
}
