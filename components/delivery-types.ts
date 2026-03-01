// ─── delivery-types.ts ────────────────────────────────────────────────────────
// Shared types, constants and pure helper functions.
// Import from here in map-view.tsx and arrival-modal.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import type { Order, DriverLocation } from "./delivery-dashboard"
export type { Order, DriverLocation }

// ─── Slot groups (passed down from parent) ────────────────────────────────────
export interface SlotGroup { slot: string; count: number; ids: string[] }

// ─── Directions API step ──────────────────────────────────────────────────────
export interface Step {
  maneuver: {
    instruction: string
    type: string
    modifier?: string
    location: [number, number]
  }
  distance: number
  duration: number
  name: string
}

// ─── MapView props ────────────────────────────────────────────────────────────
export interface MapViewProps {
  orders?: Order[]
  selectedZone?: string
  selectedOrder?: Order
  optimizedOrders?: Order[]
  driverLocation?: DriverLocation
  slotGroups?: SlotGroup[]
  onDeliveryComplete?: (orderId: string) => void
  isVisible?: boolean
}

// ─── Slot colours ─────────────────────────────────────────────────────────────
const SLOT_COLORS: Record<string, string> = {
  "09:00-11:00": "#8b5cf6", "11:00-13:00": "#3b82f6",
  "13:00-15:00": "#f59e0b", "15:00-17:00": "#10b981", "17:00-19:00": "#ef4444",
  morning_tomorrow: "#3b82f6", evening_tomorrow: "#f59e0b",
  morning: "#3b82f6", evening: "#ef4444", afternoon: "#f59e0b",
}

export function slotColor(slot?: string | null): string {
  if (!slot) return "#6b7280"
  if (SLOT_COLORS[slot]) return SLOT_COLORS[slot]
  const palette = ["#8b5cf6","#3b82f6","#10b981","#f59e0b","#ef4444","#06b6d4","#ec4899"]
  let h = 0
  for (let i = 0; i < slot.length; i++) h = (h * 31 + slot.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export function slotLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Geo helpers ──────────────────────────────────────────────────────────────
export function coords(o: Order): [number, number] | null {
  if (!o.delivery_lat || !o.delivery_lng) return null
  return [Number(o.delivery_lng), Number(o.delivery_lat)] // [lng, lat] for Mapbox
}

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

export function fmtMin(sec: number): string {
  const m = Math.ceil(sec / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── Voice ────────────────────────────────────────────────────────────────────
export function speak(text: string, voiceRef: React.MutableRefObject<boolean>): void {
  if (!voiceRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "en-IN"
  u.rate = 0.9
  window.speechSynthesis.speak(u)
}

// ─── Mapbox Directions API ────────────────────────────────────────────────────
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

export async function getRouteWithSteps(
  from: [number, number],
  to: [number, number][]
): Promise<{ geojson: GeoJSON.LineString; durationSec: number; distanceM: number; steps: Step[] } | null> {
  if (!to.length || !TOKEN) return null
  const wpts = [from, ...to].map(([lng, lat]) => `${lng},${lat}`).join(";")
  try {
    const r = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${wpts}` +
        `?geometries=geojson&overview=full&steps=true&voice_instructions=true&banner_instructions=true&access_token=${TOKEN}`
    )
    const d = await r.json()
    if (!d.routes?.[0]) return null
    const route = d.routes[0]
    const steps: Step[] = route.legs?.flatMap((leg: any) => leg.steps ?? []) ?? []
    return {
      geojson: route.geometry as GeoJSON.LineString,
      durationSec: route.duration as number,
      distanceM: route.distance as number,
      steps,
    }
  } catch {
    return null
  }
}