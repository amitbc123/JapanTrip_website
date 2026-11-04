import { create } from "zustand"
import { MANUAL_LOCATION_MS, useTreasure } from "@/treasure/store"
import { km } from "@/treasure/lib/core"
import type { LatLon } from "@/treasure/types"

export type LocationStatus = "off" | "locating" | "on" | "denied" | "unavailable" | "timeout" | "unsupported"

export interface LivePosition extends LatLon {
  accuracy: number
  /** Compass heading in degrees, when the device reports one. */
  heading: number | null
  at: number
}

interface LiveLocationState {
  status: LocationStatus
  position: LivePosition | null
  /** Position used for distances: only moves after ~100 m, so lists don't
   *  reshuffle on every GPS jitter. */
  anchor: LatLon | null
}

export const useLiveLocation = create<LiveLocationState>(() => ({ status: "off", position: null, anchor: null }))

let watchId: number | null = null
let paused = false

function onPosition(pos: GeolocationPosition) {
  const { latitude, longitude, accuracy, heading } = pos.coords
  const position: LivePosition = {
    lat: latitude,
    lon: longitude,
    accuracy,
    heading: heading !== null && !Number.isNaN(heading) ? heading : (useLiveLocation.getState().position?.heading ?? null),
    at: Date.now(),
  }
  const anchor = useLiveLocation.getState().anchor
  useLiveLocation.setState({
    status: "on",
    position,
    anchor: !anchor || km(anchor, position) > 0.1 ? { lat: latitude, lon: longitude } : anchor,
  })
}

function onError(err: GeolocationPositionError, onFail?: (status: LocationStatus) => void) {
  // Once we have a fix, a passing glitch (indoors, tunnel) keeps the last one.
  if (useLiveLocation.getState().position && err.code !== err.PERMISSION_DENIED) return
  const status: LocationStatus =
    err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable"
  stopLocation(status)
  onFail?.(status)
}

/** Starts live tracking. `onFail` runs when it can't (the caller explains
 *  what to do). Safe to call again while already running. */
export function startLocation(onFail?: (status: LocationStatus) => void) {
  if (!("geolocation" in navigator) || !window.isSecureContext) {
    useLiveLocation.setState({ status: "unsupported" })
    onFail?.("unsupported")
    return
  }
  useTreasure.getState().set({ useLoc: true })
  if (watchId !== null) return
  if (!useLiveLocation.getState().position) useLiveLocation.setState({ status: "locating" })
  watchId = navigator.geolocation.watchPosition(onPosition, (e) => onError(e, onFail), {
    enableHighAccuracy: true,
    maximumAge: 15000,
    timeout: 20000,
  })
  startCompass()
}

export function stopLocation(status: LocationStatus = "off") {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId)
  watchId = null
  stopCompass()
  useLiveLocation.setState({ status, position: null, anchor: null })
}

/* Compass for the heading cone on the map (Android Chrome: absolute event). */
const orientationEvent = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation"

function onOrientation(e: DeviceOrientationEvent) {
  const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
  const heading = typeof ios === "number" ? ios : e.absolute && e.alpha !== null ? (360 - e.alpha) % 360 : null
  const position = useLiveLocation.getState().position
  if (heading === null || !position) return
  if (position.heading !== null && Math.abs(position.heading - heading) < 3) return
  useLiveLocation.setState({ position: { ...position, heading } })
}

function startCompass() {
  window.addEventListener(orientationEvent, onOrientation as EventListener)
}
function stopCompass() {
  window.removeEventListener(orientationEvent, onOrientation as EventListener)
}

/** Save battery: no GPS while the page is in the background. */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && watchId !== null) {
    paused = true
    navigator.geolocation.clearWatch(watchId)
    watchId = null
    stopCompass()
  } else if (!document.hidden && paused) {
    paused = false
    startLocation()
  }
})

/** On open: resume tracking when the browser already allows it (no prompt),
 *  or ask once when the user hasn't turned location off here. */
export async function autoStartLocation() {
  const { useLoc } = useTreasure.getState()
  if (!useLoc || !("geolocation" in navigator) || !window.isSecureContext) return
  try {
    const state = (await navigator.permissions?.query({ name: "geolocation" }))?.state
    if (state === "denied") {
      useLiveLocation.setState({ status: "denied" })
      return
    }
  } catch {
    /* permissions API missing: just try */
  }
  startLocation()
}

/** The user's point for distances: a fresh manual one wins over GPS. */
export function useMyPoint(nowMs: number): (LatLon & { manual: boolean; label?: string }) | null {
  const manual = useTreasure((s) => s.manual)
  const useLoc = useTreasure((s) => s.useLoc)
  const anchor = useLiveLocation((s) => s.anchor)
  if (manual && nowMs - manual.at < MANUAL_LOCATION_MS) return { ...manual, manual: true }
  if (useLoc && anchor) return { ...anchor, manual: false }
  return null
}

/** Platform-specific steps for turning location on. */
export function locationHelp(status: LocationStatus): { title: string; steps: string[] } {
  const ua = navigator.userAgent
  const android = /Android/i.test(ua)
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const samsung = /SamsungBrowser/i.test(ua)
  if (status === "denied") {
    if (android && !samsung)
      return {
        title: "האתר לא קיבל הרשאה למיקום",
        steps: [
          "לוחצים על הסמל שמשמאל לכתובת האתר בשורת הכתובת של Chrome.",
          "הרשאות ← מיקום ← מאשרים.",
          "חוזרים לכאן ולוחצים \"לנסות שוב\".",
        ],
      }
    if (samsung)
      return {
        title: "האתר לא קיבל הרשאה למיקום",
        steps: ["תפריט ☰ ← הגדרות ← אתרים והורדות ← הרשאות אתר ← מיקום.", "מאפשרים לאתר הזה וחוזרים לכאן."],
      }
    if (ios)
      return {
        title: "האתר לא קיבל הרשאה למיקום",
        steps: ["הגדרות ← פרטיות ← שירותי מיקום ← Safari ← \"בזמן השימוש\".", "בספארי: aA בשורת הכתובת ← הגדרות אתר ← מיקום ← לאשר."],
      }
    return { title: "האתר לא קיבל הרשאה למיקום", steps: ["מאשרים מיקום להגדרות האתר בדפדפן (הסמל שליד הכתובת), ולוחצים \"לנסות שוב\"."] }
  }
  if (status === "unavailable")
    return {
      title: "הטלפון לא מצא מיקום",
      steps: android
        ? ["בודקים ששירות המיקום של הטלפון דלוק (מושכים את התפריט העליון ← מיקום).", "ליד חלון או בחוץ זה מהיר יותר."]
        : ["בודקים ששירותי המיקום של הטלפון דלוקים.", "ליד חלון או בחוץ זה מהיר יותר."],
    }
  if (status === "timeout") return { title: "המיקום לוקח יותר מדי זמן", steps: ["כנראה אין קליטת GPS כרגע. אפשר לנסות שוב או לבחור מיקום ידנית."] }
  if (status === "unsupported") return { title: "הדפדפן לא נותן מיקום", steps: ["אפשר לבחור מיקום ידנית, למטה."] }
  return { title: "", steps: [] }
}
