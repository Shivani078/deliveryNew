

"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Navigation, Clock, ChevronDown, ChevronUp,
  Volume2, VolumeX, RotateCcw, ArrowUpRight, ArrowUpLeft,
  ArrowUp, Crosshair, MapPin,
} from "lucide-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

import ArrivalModal from "./arrival-modal"
import {
  coords, haversineKm, fmtDist, fmtMin, speak,
  slotColor, slotLabel, getRouteWithSteps,
} from "./delivery-types"
import type { MapViewProps, SlotGroup, Step } from "./delivery-types"

// ─── Constants ────────────────────────────────────────────────────────────────
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""

// ─── Maneuver icon ────────────────────────────────────────────────────────────
function ManeuverIcon({ type, modifier }: { type: string; modifier?: string }) {
  const cls = "w-6 h-6"
  if (type === "arrive")                                  return <MapPin className={cls} />
  if (modifier === "left" || modifier === "sharp left")   return <ArrowUpLeft className={cls} />
  if (modifier === "right" || modifier === "sharp right") return <ArrowUpRight className={cls} />
  if (modifier === "slight left")  return <ArrowUpLeft className={`${cls} opacity-60`} />
  if (modifier === "slight right") return <ArrowUpRight className={`${cls} opacity-60`} />
  return <ArrowUp className={cls} />
}

// ─── MapCanvas (inner — only mounted when tab is visible) ─────────────────────
function MapCanvas({
  orders, selectedOrder, optimizedOrders,
  driverLocation, slotGroups, onDeliveryComplete,
}: Omit<MapViewProps, "isVisible">) {

  // ── DOM / Mapbox refs ────────────────────────────────────────────────────────
  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<mapboxgl.Map | null>(null)
  const mapReadyRef     = useRef(false)
  const mountedRef      = useRef(true)
  const driverMkrRef    = useRef<mapboxgl.Marker | null>(null)
  const stopMkrs        = useRef<mapboxgl.Marker[]>([])
  const watchIdRef      = useRef<number | null>(null)
  const drawnRef        = useRef(false)

  // ── Mutable refs (read by GPS closure — no stale state issues) ───────────────
  const lastPosRef      = useRef<[number, number] | null>(null)
  const lastHeadingRef  = useRef<number>(0)
  const lastAnnounceRef = useRef<number>(-1)
  const arrivedRef      = useRef(false)   // prevents repeated arrival popup per stop
  const followRef       = useRef(true)
  const voiceRef        = useRef(true)
  const is3DRef         = useRef(true)
  const stepsRef        = useRef<Step[]>([])
  const stepIdxRef      = useRef(0)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [mapReady,      setMapReady]      = useState(false)
  const [stopIdx,       setStopIdx]       = useState(0)
  const [eta,           setEta]           = useState<string | null>(null)
  const [routeKm,       setRouteKm]       = useState<number | null>(null)
  const [hudCollapsed,  setHudCollapsed]  = useState(false)
  const [voiceOn,       setVoiceOn]       = useState(true)
  const [steps,         setSteps]         = useState<Step[]>([])
  const [currentStepI,  setCurrentStepI]  = useState(0)
  const [nextStepDist,  setNextStepDist]  = useState<string | null>(null)
  const [isRerouting,   setIsRerouting]   = useState(false)
  const [followDriver,  setFollowDriver]  = useState(true)
  const [speed,         setSpeed]         = useState<number | null>(null)
  const [is3D,          setIs3D]          = useState(true)
  const [showArrival,   setShowArrival]   = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isNavMode    = (optimizedOrders?.length ?? 0) > 0
  const pendingStops = (optimizedOrders ?? [])
    .filter(o => o.status === "pending" && coords(o))
    .sort((a, b) => (a.optimized_sequence ?? 999) - (b.optimized_sequence ?? 999))
  const currentStop  = pendingStops[stopIdx] ?? null
  const stopsLeft    = pendingStops.length - stopIdx
  const currentStep  = steps[currentStepI] ?? null

  // ── Ref+state sync helpers ───────────────────────────────────────────────────
  const setFollow = useCallback((v: boolean) => { followRef.current = v; setFollowDriver(v) }, [])
  const setVoice  = useCallback((v: boolean) => { voiceRef.current  = v; setVoiceOn(v)      }, [])
  const set3D     = useCallback((v: boolean) => { is3DRef.current   = v; setIs3D(v)         }, [])

  // Reset arrival flag each time we advance to a new stop
  useEffect(() => { arrivedRef.current = false; setShowArrival(false) }, [stopIdx])

  // ── Map init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    if (!containerRef.current || !TOKEN) return

    mapboxgl.accessToken = TOKEN
    const firstStop = coords(pendingStops[0] ?? ({} as any))
    const center: [number, number] = [
      driverLocation?.lng ?? firstStop?.[0] ?? 77.209,
      driverLocation?.lat ?? firstStop?.[1] ?? 28.613,
    ]

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center, zoom: 15, pitch: 55, bearing: 0, attributionControl: false,
    })

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left")
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right")

    // Only disable follow when the user physically drags (originalEvent present)
    map.on("movestart", (e: any) => { if (e.originalEvent) setFollow(false) })

    map.once("load", () => {
      if (!mountedRef.current) return
      map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } })
      map.addLayer({ id: "route-case", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1a56db", "line-width": 12, "line-opacity": 0.4 } })
      map.addLayer({ id: "route-line", type: "line", source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 7 } })
      map.resize()
      mapReadyRef.current = true
      if (mountedRef.current) setMapReady(true)
    })

    mapRef.current = map
    return () => {
      mountedRef.current = false; mapReadyRef.current = false
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      stopMkrs.current.forEach(m => m.remove())
      driverMkrRef.current?.remove()
      map.remove(); mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2D / 3D toggle ───────────────────────────────────────────────────────────
  const toggle3D = useCallback(() => {
    const next = !is3DRef.current; set3D(next)
    mapRef.current?.easeTo({
      pitch: next ? 55 : 0, bearing: next ? lastHeadingRef.current : 0, duration: 700,
    })
  }, [set3D])

  // ── Draw route ────────────────────────────────────────────────────────────────
  const drawRoute = useCallback(async (from: [number, number]) => {
    if (!mapRef.current || !mapReadyRef.current) return
    const remaining = pendingStops.slice(stopIdx).map(s => coords(s)).filter(Boolean) as [number, number][]
    if (!remaining.length) return

    setIsRerouting(true)
    const result = await getRouteWithSteps(from, remaining)
    setIsRerouting(false)
    if (!result || !mapRef.current || !mapReadyRef.current || !mountedRef.current) return

    const src = mapRef.current.getSource("route") as mapboxgl.GeoJSONSource | undefined
    src?.setData({ type: "Feature", properties: {}, geometry: result.geojson })
    setEta(fmtMin(result.durationSec))
    setRouteKm(+(result.distanceM / 1000).toFixed(1))
    stepsRef.current = result.steps; setSteps(result.steps)
    stepIdxRef.current = 0;          setCurrentStepI(0)
    lastAnnounceRef.current = -1
    if (result.steps[0]) speak(result.steps[0].maneuver.instruction, voiceRef)

    if (followRef.current) {
      const rc = result.geojson.coordinates as [number, number][]
      if (rc.length > 1 && mapRef.current) {
        const bounds = rc.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(rc[0], rc[0]))
        bounds.extend(from)
        mapRef.current.fitBounds(bounds, { padding: 100, maxZoom: 15, duration: 800 })
      }
    }
  }, [pendingStops, stopIdx])

  useEffect(() => { drawnRef.current = false }, [stopIdx])
  useEffect(() => {
    if (!mapReady || !isNavMode || pendingStops.length === 0 || drawnRef.current) return
    drawnRef.current = true
    const from = driverLocation ? [driverLocation.lng, driverLocation.lat] as [number, number] : null
    if (from) drawRoute(from)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, stopIdx, isNavMode, pendingStops.length])

  // ── Re-center ─────────────────────────────────────────────────────────────────
  const recenter = useCallback(() => {
    setFollow(true)
    const p = lastPosRef.current
    if (p && mapRef.current) {
      mapRef.current.easeTo({
        center: p, zoom: 16,
        pitch:   is3DRef.current ? 55 : 0,
        bearing: is3DRef.current ? lastHeadingRef.current : 0,
        duration: 700,
      })
    }
  }, [setFollow])

  // ── GPS watch (registered once; reads refs for freshness) ────────────────────
  useEffect(() => {
    if (!isNavMode || !mapReady || !navigator.geolocation) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return
        const p: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        const heading = pos.coords.heading ?? 0
        if (pos.coords.speed != null) setSpeed(Math.round(pos.coords.speed * 3.6))
        lastPosRef.current    = p
        lastHeadingRef.current = heading

        // Driver dot
        if (!driverMkrRef.current && mapRef.current && mapReadyRef.current) {
          const el = document.createElement("div")
          el.className = "driver-dot"
          el.style.cssText = "width:22px;height:22px;background:#3b82f6;border:3px solid white;border-radius:50%;"
          driverMkrRef.current = new mapboxgl.Marker({ element: el, rotationAlignment: "map" })
            .setLngLat(p).addTo(mapRef.current)
        } else { driverMkrRef.current?.setLngLat(p) }
        if (heading != null) driverMkrRef.current?.setRotation(heading)

        // Camera follow (only when user hasn't taken free-look)
        if (followRef.current && mapRef.current && mapReadyRef.current) {
          mapRef.current.easeTo({
            center: p, zoom: 16,
            pitch:   is3DRef.current ? 55 : 0,
            bearing: is3DRef.current ? heading : 0,
            duration: 800, easing: t => t,
          })
        }
      },
      err => console.warn("[map] GPS:", err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNavMode, mapReady])

  // ── Proximity + step-advance polling (needs fresh currentStop) ───────────────
  useEffect(() => {
    if (!isNavMode || !currentStop) return
    const id = setInterval(() => {
      const p = lastPosRef.current; if (!p) return

      // Step advancement
      const localSteps = stepsRef.current
      if (localSteps.length > 0) {
        let nearestI = stepIdxRef.current, minDist = Infinity
        localSteps.forEach((step, i) => {
          if (i < stepIdxRef.current) return
          const sLoc = step.maneuver.location as [number, number]
          const d = haversineKm(p, [sLoc[0], sLoc[1]])
          if (d < minDist) { minDist = d; nearestI = i }
        })
        if (nearestI > stepIdxRef.current && minDist < 0.03) {
          stepIdxRef.current = nearestI; setCurrentStepI(nearestI)
          if (lastAnnounceRef.current !== nearestI) {
            lastAnnounceRef.current = nearestI
            speak(localSteps[nearestI].maneuver.instruction, voiceRef)
          }
        }
        const nextStep = localSteps[stepIdxRef.current + 1]
        if (nextStep) {
          const nextLoc = nextStep.maneuver.location as [number, number]
          const distToNext = haversineKm(p, [nextLoc[0], nextLoc[1]]) * 1000
          setNextStepDist(fmtDist(distToNext))
          if (distToNext < 200 && lastAnnounceRef.current !== stepIdxRef.current + 1) {
            lastAnnounceRef.current = stepIdxRef.current + 1
            speak(`In ${fmtDist(distToNext)}, ${nextStep.maneuver.instruction}`, voiceRef)
          }
        }
      }

      // Arrival check
      const dest = coords(currentStop)
      if (dest && haversineKm(p, dest) < 0.05 && !arrivedRef.current) {
        arrivedRef.current = true
        setShowArrival(true)
        speak(
          `You have arrived. Customer: ${currentStop.name ?? "customer"}. Please confirm delivery.`,
          voiceRef
        )
      }
    }, 3000)
    return () => clearInterval(id)
  }, [isNavMode, currentStop])

  // ── Place stop markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    stopMkrs.current.forEach(m => m.remove()); stopMkrs.current = []

    const stops = isNavMode ? pendingStops : (orders ?? []).filter(o => coords(o))
    stops.forEach((stop, idx) => {
      const c = coords(stop); if (!c) return
      const done    = isNavMode && idx < stopIdx
      const current = isNavMode && idx === stopIdx
      const color   = done ? "#22c55e" : current ? "#ef4444" : slotColor(stop.delivery_slot)

      const el = document.createElement("div")
      el.style.cssText = `
        width:32px;height:32px;border-radius:50%;background:${color};
        border:3px solid white;display:flex;align-items:center;justify-content:center;
        color:white;font-size:12px;font-weight:700;
        box-shadow:0 2px 12px rgba(0,0,0,.5);cursor:pointer;
        ${current ? "transform:scale(1.35);box-shadow:0 0 0 4px rgba(239,68,68,.3)" : ""}
      `
      el.textContent = done ? "✓" : String(idx + 1)
      el.addEventListener("click", () => setFollow(false))

      new mapboxgl.Marker({ element: el }).setLngLat(c)
        .setPopup(new mapboxgl.Popup({ offset: 32, closeButton: true })
          .setHTML(`<div style="font-family:system-ui;padding:6px 2px">
            <b style="font-size:13px">#${idx + 1} · ${stop.name ?? stop.order_number ?? stop.id?.slice(0, 8)}</b>
            <div style="font-size:11px;color:#64748b;margin-top:3px">${[stop.address, stop.city].filter(Boolean).join(", ") || "—"}</div>
            <div style="margin-top:6px;font-size:13px;font-weight:700;color:#16a34a">₹${stop.total ?? 0}</div>
            ${stop.delivery_slot
              ? `<div style="margin-top:4px"><span style="background:${slotColor(stop.delivery_slot)};color:white;padding:2px 8px;border-radius:999px;font-size:10px">${slotLabel(stop.delivery_slot)}</span></div>`
              : ""}
          </div>`))
        .addTo(mapRef.current!)
      stopMkrs.current.push(new mapboxgl.Marker({ element: el }).setLngLat(c))
    })

    if (!driverLocation && !isNavMode) {
      const allC = stops.map(coords).filter(Boolean) as [number, number][]
      if (allC.length > 0) {
        const bounds = allC.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(allC[0], allC[0]))
        mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 15 })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, pendingStops.length, stopIdx, isNavMode])

  useEffect(() => {
    if (!selectedOrder || !mapRef.current || !mapReadyRef.current) return
    const c = coords(selectedOrder)
    if (c) { setFollow(false); mapRef.current.flyTo({ center: c, zoom: 16 }) }
  }, [selectedOrder, setFollow])

  // ── Delivery confirmed (called by ArrivalModal) ───────────────────────────────
  const handleDeliveryConfirmed = useCallback(() => {
    if (!currentStop) return
    setShowArrival(false)
    speak("Delivery confirmed. Navigating to next stop.", voiceRef)
    onDeliveryComplete?.(currentStop.id)
    setStopIdx(s => s + 1)
    setEta(null); setRouteKm(null)
    stepsRef.current = []; setSteps([])
    stepIdxRef.current = 0; setCurrentStepI(0)
    setFollow(true)
    drawnRef.current = false
    setTimeout(() => { const p = lastPosRef.current; if (p) drawRoute(p) }, 600)
  }, [currentStop, onDeliveryComplete, drawRoute, setFollow])

  // ── Auto-reroute ──────────────────────────────────────────────────────────────
  const rerouteCheck = useCallback(() => {
    const p = lastPosRef.current
    if (!p || isRerouting || !stepsRef.current.length) return
    const stepLoc = stepsRef.current[stepIdxRef.current]?.maneuver?.location as [number, number] | undefined
    if (!stepLoc) return
    if (haversineKm(p, [stepLoc[0], stepLoc[1]]) * 1000 > 350) {
      speak("Recalculating route.", voiceRef); drawRoute(p)
    }
  }, [isRerouting, drawRoute])

  useEffect(() => {
    if (!isNavMode) return
    const id = setInterval(rerouteCheck, 15000)
    return () => clearInterval(id)
  }, [isNavMode, rerouteCheck])

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full" style={{ height: isNavMode ? "100svh" : "480px" }}>
      <style>{`
        .driver-dot { animation: driverPulse 2s infinite; }
        @keyframes driverPulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.35); }
          50%      { box-shadow: 0 0 0 14px rgba(59,130,246,0); }
        }
      `}</style>

      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}

      {/* All deliveries done */}
      {mapReady && isNavMode && pendingStops.length === 0 && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
          <div className="bg-white rounded-2xl p-8 text-center max-w-xs mx-4 shadow-2xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-slate-900">All Done!</h2>
            <p className="text-slate-500 text-sm mt-2">All deliveries for today are complete.</p>
          </div>
        </div>
      )}

      {/* ── Arrival modal (imported from arrival-modal.tsx) ── */}
      {showArrival && currentStop && (
        <ArrivalModal
          order={currentStop}
          stopNumber={stopIdx + 1}
          totalStops={pendingStops.length}
          onConfirm={handleDeliveryConfirmed}
          onDismiss={() => setShowArrival(false)}
        />
      )}

      {/* Top nav instruction banner */}
      {isNavMode && currentStop && mapReady && currentStep && !showArrival && (
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="mx-3 mt-3 md:mx-auto md:max-w-sm">
            <div className="bg-blue-600 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
              <div className="bg-blue-500 rounded-xl p-2 shrink-0 text-white">
                <ManeuverIcon type={currentStep.maneuver.type} modifier={currentStep.maneuver.modifier} />
              </div>
              <div className="flex-1 min-w-0">
                {nextStepDist && (
                  <div className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-0.5">
                    In {nextStepDist}
                  </div>
                )}
                <div className="text-white font-bold text-sm leading-tight truncate">
                  {steps[currentStepI + 1]?.maneuver?.instruction ?? currentStep.maneuver.instruction}
                </div>
                {steps[currentStepI + 1]?.name && (
                  <div className="text-blue-200 text-xs mt-0.5 truncate">
                    onto {steps[currentStepI + 1].name}
                  </div>
                )}
              </div>
              {isRerouting && <RotateCcw className="w-4 h-4 text-blue-200 animate-spin shrink-0" />}
            </div>
          </div>
        </div>
      )}

      {/* Free-look indicator */}
      {isNavMode && mapReady && !followDriver && !showArrival && (
        <div className="absolute z-20 pointer-events-none"
          style={{ top: currentStep ? "90px" : "16px", left: "50%", transform: "translateX(-50%)" }}>
          <div className="bg-slate-900/85 backdrop-blur text-white text-xs font-semibold
            px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Free look · tap <Crosshair className="w-3 h-3 inline mx-1" /> to return
          </div>
        </div>
      )}

      {/* Right-side controls */}
      {isNavMode && mapReady && !showArrival && (
        <div className="absolute right-3 z-20 flex flex-col gap-2" style={{ top: "160px" }}>
          <button onClick={toggle3D}
            className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center
              text-slate-800 hover:bg-slate-100 font-black text-xs tracking-tight transition-all"
            title={is3D ? "Switch to 2D" : "Switch to 3D"}>
            {is3D ? "2D" : "3D"}
          </button>
          <button onClick={() => { setVoice(!voiceOn); if (voiceOn) window.speechSynthesis?.cancel() }}
            className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all
              ${voiceOn ? "bg-blue-600 text-white" : "bg-white text-slate-400"}`}>
            {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={recenter}
            className={`w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all
              ${followDriver ? "bg-blue-600 text-white" : "bg-amber-400 text-white"}`}>
            <Crosshair className="w-4 h-4" />
          </button>
          <button onClick={() => { const p = lastPosRef.current; if (p) { drawnRef.current = false; drawRoute(p) } }}
            className="w-10 h-10 rounded-full bg-white text-slate-600 shadow-lg flex items-center justify-center">
            <RotateCcw className={`w-4 h-4 ${isRerouting ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      )}

      {/* Browse mode 2D/3D */}
      {!isNavMode && mapReady && (
        <div className="absolute top-4 right-16 z-10">
          <button onClick={toggle3D}
            className="bg-white text-slate-800 font-black text-xs px-3 py-1.5 rounded-full
              shadow border border-slate-200 hover:bg-slate-50 tracking-tight transition-all">
            {is3D ? "2D" : "3D"}
          </button>
        </div>
      )}

      {/* Speedometer */}
      {isNavMode && mapReady && speed !== null && !showArrival && (
        <div className="absolute left-4 z-20" style={{ bottom: "200px" }}>
          <div className="bg-white rounded-xl shadow-lg px-3 py-2 text-center min-w-[56px]">
            <div className="text-xl font-black text-slate-900 leading-none">{speed}</div>
            <div className="text-xs text-slate-400 font-medium">km/h</div>
          </div>
        </div>
      )}

      {/* Slot legend */}
      {isNavMode && (slotGroups ?? []).length > 0 && mapReady && (
        <div className="absolute left-4 z-10 flex flex-col gap-1.5" style={{ top: "70px" }}>
          {(slotGroups ?? []).map(g => (
            <div key={g.slot}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white shadow"
              style={{ background: slotColor(g.slot === "no-slot" ? undefined : g.slot) }}>
              <Clock className="w-3 h-3 shrink-0" />
              {g.slot === "no-slot" ? "No slot" : slotLabel(g.slot)}
              <span className="opacity-80">({g.count})</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom HUD */}
      {isNavMode && currentStop && mapReady && !showArrival && (
        <div className="absolute bottom-4 left-3 right-3 md:left-auto md:right-5 md:w-80 z-20">
          <div className="h-1 bg-slate-300/50 rounded-full mb-2 mx-1 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700 rounded-full"
              style={{ width: `${(stopIdx / Math.max(pendingStops.length, 1)) * 100}%` }} />
          </div>
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-white/60">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
                  Stop {stopIdx + 1}/{pendingStops.length}
                </span>
                {currentStop.delivery_slot && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ background: slotColor(currentStop.delivery_slot) }}>
                    {slotLabel(currentStop.delivery_slot)}
                  </span>
                )}
              </div>
              <button onClick={() => setHudCollapsed(v => !v)} className="text-slate-400 hover:text-slate-700 p-1">
                {hudCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {!hudCollapsed && (
              <div className="px-4 pb-4">
                <p className="font-bold text-slate-900 text-base leading-snug">
                  {currentStop.name ?? currentStop.order_number ?? `Order #${currentStop.id?.slice(0, 8)}`}
                </p>
                <p className="text-sm text-slate-500 mt-0.5 leading-snug">
                  {[currentStop.address, currentStop.city].filter(Boolean).join(", ") || "No address"}
                </p>
                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 mt-3">
                  <span className="text-sm font-bold text-slate-900">₹{currentStop.total ?? 0}</span>
                  {eta && (
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-600">{eta}</span>
                      {routeKm && <span className="text-xs text-slate-400 ml-1.5">· {routeKm} km</span>}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${coords(currentStop)?.[1]},${coords(currentStop)?.[0]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    🗺️ Google Maps
                  </a>
                  <a href={`https://maps.apple.com/?daddr=${coords(currentStop)?.[1]},${coords(currentStop)?.[0]}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs font-semibold py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    🍎 Apple Maps
                  </a>
                </div>
                {/* Manual trigger for arrival card */}
                <button
                  onClick={() => { arrivedRef.current = true; setShowArrival(true) }}
                  className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-white
                    bg-green-600 hover:bg-green-500 active:scale-95 transition-all">
                  📦 I'm Here — Confirm Delivery
                </button>
                {stopsLeft > 1 && (
                  <p className="text-xs text-center text-slate-400 mt-2">
                    {stopsLeft - 1} more stop{stopsLeft - 1 > 1 ? "s" : ""} after this
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browse mode badge */}
      {!isNavMode && mapReady && (
        <div className="absolute top-4 left-4 z-10">
          <Badge className="bg-white text-slate-800 shadow border border-slate-200 text-xs font-medium">
            <Navigation className="w-3 h-3 mr-1" />
            {(orders ?? []).filter(o => coords(o)).length} orders on map
          </Badge>
        </div>
      )}
    </div>
  )
}

// ─── Public export (only mounts MapCanvas once tab is visible) ────────────────
export default function MapView(props: MapViewProps) {
  const { isVisible = true, ...rest } = props
  const [everVisible, setEverVisible] = useState(isVisible)
  useEffect(() => { if (isVisible) setEverVisible(true) }, [isVisible])

  if (!TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200 gap-3">
        <div className="text-4xl">🗺️</div>
        <p className="text-slate-600 font-medium">Mapbox token not configured</p>
        <code className="text-xs bg-slate-100 px-2 py-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code>
      </div>
    )
  }
  if (!everVisible) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-900"
        style={{ height: (rest.optimizedOrders?.length ?? 0) > 0 ? "100svh" : "480px" }}>
        <Loader2 className="w-8 h-8 text-slate-600 animate-spin mb-2" />
        <p className="text-slate-500 text-sm">Map will load when you open this tab</p>
      </div>
    )
  }
  return <MapCanvas {...rest} />
}