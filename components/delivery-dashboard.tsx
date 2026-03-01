


"use client"
import { useState, useCallback } from "react"
import useOrders from "@/lib/useOrders"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MapPin, Package, Navigation, ArrowUpDown, Play,
  Loader2, CheckCircle2, RefreshCw, Route, Clock,
  ChevronDown, ChevronUp, Phone, X
} from "lucide-react"
import OrderCard from "./order-card"
import DeliveryDetailsModal from "./delivery-details-modal"
import DriverProfile from "./driver-profile"

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Order {
  id: string
  status: "pending" | "delivered" | "in_progress"
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  order_number?: string
  total?: number
  payment_method?: string
  created_at: string
  updated_at?: string
  delivery_lat?: number
  delivery_lng?: number
  delivery_slot?: string
  optimized_sequence?: number
  distance?: number
}

export interface DriverLocation {
  lat: number
  lng: number
  accuracy: number
}

interface SlotGroup {
  slot: string
  count: number
  ids: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function currentSlot(): string {
  const h = new Date().getHours()
  const slots = ["09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00", "17:00-19:00"]
  for (const slot of slots) {
    const endH = parseInt(slot.split("-")[1])
    if (h < endH) return slot
  }
  return slots[slots.length - 1]
}

function slotLabel(slot: string) {
  if (slot === "all") return "All Slots"
  if (slot === "no-slot") return "No Slot"
  return slot
}

// ─── Slot Picker Modal ────────────────────────────────────────────────────────
function SlotPickerModal({
  availableSlots,
  todayOrders,
  onConfirm,
  onClose,
}: {
  availableSlots: string[]
  todayOrders: Order[]
  onConfirm: (slot: string) => void
  onClose: () => void
}) {
  const [picked, setPicked] = useState<string>(currentSlot())

  // Only slots that actually have pending orders (exclude "all")
  const slotsWithPending = availableSlots.filter((s) => {
    if (s === "all") return false
    const count = todayOrders.filter(
      (o) =>
        o.status === "pending" &&
        (s === "no-slot" ? !o.delivery_slot : o.delivery_slot === s)
    ).length
    return count > 0
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Which slot are you delivering?</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Only orders from that slot will be optimized & routed.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slot options */}
        {slotsWithPending.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No pending orders in any slot for today.
          </p>
        ) : (
          <div className="space-y-2">
            {slotsWithPending.map((slot) => {
              const count = todayOrders.filter(
                (o) =>
                  o.status === "pending" &&
                  (slot === "no-slot" ? !o.delivery_slot : o.delivery_slot === slot)
              ).length
              const isCurrent = slot === currentSlot()
              const isSelected = picked === slot

              return (
                <button
                  key={slot}
                  onClick={() => setPicked(slot)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`font-semibold text-sm ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                      {slotLabel(slot)}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Now
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count} order{count !== 1 ? "s" : ""}
                  </span>
                </button>
              )
            })}

            {/* "All slots" escape hatch */}
            <button
              onClick={() => setPicked("all")}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                picked === "all"
                  ? "border-orange-400 bg-orange-50"
                  : "border-dashed border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className={`w-4 h-4 ${picked === "all" ? "text-orange-500" : "text-slate-400"}`} />
                <span className={`font-semibold text-sm ${picked === "all" ? "text-orange-700" : "text-slate-600"}`}>
                  All slots (no filter)
                </span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                picked === "all" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500"
              }`}>
                {todayOrders.filter((o) => o.status === "pending").length} total
              </span>
            </button>
          </div>
        )}

        {/* Confirm */}
        <Button
          onClick={() => onConfirm(picked)}
          disabled={slotsWithPending.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-semibold"
        >
          <Route className="w-4 h-4 mr-2" />
          Optimize & Start →
        </Button>
      </div>
    </div>
  )
}

// ─── Mobile-only: compact collapsible order row ───────────────────────────────
function MobileOrderRow({
  order,
  index,
  optimized,
  onSelect,
  onNavigate,
}: {
  order: Order
  index: number
  optimized: boolean
  onSelect: () => void
  onNavigate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const priority = (order.optimized_sequence ?? index) + 1
  const isDelivered = order.status === "delivered"

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isDelivered
          ? "border-green-200 bg-green-50/60"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      {/* Collapsed row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-slate-50"
      >
        <span
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            isDelivered ? "bg-green-500 text-white" : "bg-blue-600 text-white"
          }`}
        >
          {isDelivered ? "✓" : `#${priority}`}
        </span>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate leading-tight">
            {order.name ?? "Unknown"}
          </p>
          <p className="text-xs text-slate-500 truncate leading-tight">
            {order.address ?? order.city ?? "No address"}
            {order.zip_code ? ` · ${order.zip_code}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right mr-1">
          {order.total ? (
            <p className="text-sm font-bold text-blue-700">₹{order.total}</p>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
          {order.distance != null && (
            <p className="text-xs text-slate-400">{order.distance.toFixed(1)} km</p>
          )}
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            {order.phone && (
              <a
                href={`tel:${order.phone}`}
                className="flex items-center gap-1 text-blue-600 font-medium col-span-2"
              >
                <Phone className="w-3.5 h-3.5" /> {order.phone}
              </a>
            )}
            {order.delivery_slot && (
              <span className="flex items-center gap-1 col-span-2">
                <Clock className="w-3 h-3" />
                <span className="font-medium">Slot:</span> {order.delivery_slot}
              </span>
            )}
            {order.distance != null && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {order.distance.toFixed(2)} km
              </span>
            )}
            {order.payment_method && (
              <span className="capitalize">
                <span className="font-medium">Pay:</span> {order.payment_method}
              </span>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onNavigate}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold active:bg-blue-700"
            >
              <Navigation className="w-4 h-4" /> Navigate
            </button>
            <button
              onClick={onSelect}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 text-slate-800 text-sm font-semibold active:bg-slate-200"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DeliveryDashboard({
  onNavigateToMap,
}: {
  onNavigateToMap?: (
    firstOrder: Order,
    allOrders: Order[],
    driverLocation: DriverLocation,
    slotGroups?: SlotGroup[]
  ) => void
}) {
  const { orders = [], loading, error, refresh } = useOrders()

  const [selectedSlot, setSelectedSlot] = useState<string>("all")
  const [pincodeFilter, setPincodeFilter] = useState("")
  const [sortBy, setSortBy] = useState<"distance" | "time" | "amount" | "sequence">("time")
  const [deliveryMode, setDeliveryMode] = useState<"single" | "multi">("single")

  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  const [optimizing, setOptimizing] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [optimizedOrders, setOptimizedOrders] = useState<Order[]>([])
  const [optimizedSlot, setOptimizedSlot] = useState<string | null>(null) // ← tracks which slot was optimized
  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([])
  const [geocodeInfo, setGeocodeInfo] = useState<{ success: number; failed: number } | null>(null)

  const [deliveryStarted, setDeliveryStarted] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // ── NEW: slot picker modal state ──────────────────────────────────────────
  const [showSlotPicker, setShowSlotPicker] = useState(false)
  const [pendingStartAfterSlotPick, setPendingStartAfterSlotPick] = useState(false)

  // ── Derived data ──────────────────────────────────────────────────────────
  const todayOrders: Order[] = (orders as Order[]).filter(
    (o) => o.created_at?.startsWith(todayISO())
  )

  const availableSlots = [
    "all",
    ...Array.from(
      new Set(todayOrders.map((o) => o.delivery_slot).filter(Boolean) as string[])
    ).sort(),
  ]

  const baseOrders = optimized && optimizedOrders.length > 0 ? optimizedOrders : todayOrders

  const filteredOrders = baseOrders.filter((o) => {
    const matchesSlot =
      selectedSlot === "all" ||
      (selectedSlot === "no-slot" ? !o.delivery_slot : o.delivery_slot === selectedSlot)
    const matchesPincode = !pincodeFilter || (o.zip_code ?? "").includes(pincodeFilter)
    return matchesSlot && matchesPincode
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (optimized && sortBy === "sequence")
      return (a.optimized_sequence ?? 999) - (b.optimized_sequence ?? 999)
    switch (sortBy) {
      case "distance": return (a.distance ?? 0) - (b.distance ?? 0)
      case "time":     return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "amount":   return (b.total ?? 0) - (a.total ?? 0)
      default:         return 0
    }
  })

  const pendingCount   = sortedOrders.filter((o) => o.status === "pending").length
  const deliveredCount = todayOrders.filter((o) => o.status === "delivered").length
  const totalDistance  = sortedOrders
    .filter((o) => o.status === "pending")
    .reduce((s, o) => s + (o.distance ?? 0), 0)

  // ── Geolocation ───────────────────────────────────────────────────────────
  const handleLocate = useCallback(async () => {
    setLocating(true)
    setLocationError(null)
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      )
      setDriverLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      })
    } catch (e: any) {
      setLocationError(e.message ?? "Location access denied")
    } finally {
      setLocating(false)
    }
  }, [])

  // ── Optimize Route (now slot-aware) ───────────────────────────────────────
  const handleOptimizeRoute = useCallback(async (loc?: DriverLocation, forSlot?: string) => {
    const activeLoc = loc ?? driverLocation
    if (!activeLoc) return

    // Filter pending orders by the chosen slot
    const slotToOptimize = forSlot ?? optimizedSlot ?? "all"
    const pending = todayOrders.filter((o) => {
      if (o.status !== "pending") return false
      if (slotToOptimize === "all") return true
      if (slotToOptimize === "no-slot") return !o.delivery_slot
      return o.delivery_slot === slotToOptimize
    })

    if (pending.length === 0) {
      alert(`No pending orders for slot: ${slotLabel(slotToOptimize)}`)
      return null
    }

    setOptimizing(true)
    try {
      const res = await fetch("/api/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: activeLoc.lat, lng: activeLoc.lng },
          orders: pending.map((o) => ({
            id: o.id,
            lat: o.delivery_lat ?? null,
            lng: o.delivery_lng ?? null,
            address: o.address,
            city: o.city,
            state: o.state,
            zip_code: o.zip_code,
            delivery_slot: o.delivery_slot,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? res.statusText)
      }

      const data = await res.json() as {
        optimizedIds: string[]
        coordsMap: Record<string, { lat: number; lng: number }>
        slotGroups: SlotGroup[]
        geocodedCount: { success: number; failed: number }
        skipped: number
      }

      const merged: Order[] = todayOrders.map((o) => {
        const seq = data.optimizedIds.indexOf(o.id)
        const coords = data.coordsMap?.[o.id]
        return {
          ...o,
          optimized_sequence: seq === -1 ? 999 : seq,
          ...(coords && !o.delivery_lat ? { delivery_lat: coords.lat, delivery_lng: coords.lng } : {}),
        }
      })

      setOptimizedOrders(merged)
      setSlotGroups(data.slotGroups ?? [])
      setGeocodeInfo(data.geocodedCount)
      setOptimized(true)
      setOptimizedSlot(slotToOptimize)
      setSortBy("sequence")

      // Update the view filter to match the optimized slot
      if (slotToOptimize !== "all") setSelectedSlot(slotToOptimize)

      return { merged, slotGroups: data.slotGroups ?? [] }
    } catch (e: any) {
      alert(`Route optimization failed: ${e.message}`)
      return null
    } finally {
      setOptimizing(false)
    }
  }, [driverLocation, todayOrders, optimizedSlot])

  // ── Slot picker confirm ───────────────────────────────────────────────────
  const handleSlotConfirm = async (slot: string) => {
    setShowSlotPicker(false)
    setOptimizedSlot(slot)

    let loc = driverLocation
    if (!loc) {
      setLocating(true)
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
        )
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
        setDriverLocation(loc)
      } catch (e: any) {
        setLocationError(e.message ?? "Location access denied")
        setLocating(false)
        return
      }
      setLocating(false)
    }

    const result = await handleOptimizeRoute(loc, slot)
    if (!result) return

    if (pendingStartAfterSlotPick) {
      setPendingStartAfterSlotPick(false)
      setDeliveryStarted(true)
      const firstPending = [...result.merged]
        .sort((a, b) => (a.optimized_sequence ?? 999) - (b.optimized_sequence ?? 999))
        .find((o) => {
          if (o.status !== "pending") return false
          if (slot === "all") return true
          if (slot === "no-slot") return !o.delivery_slot
          return o.delivery_slot === slot
        })

      if (firstPending && onNavigateToMap) {
        onNavigateToMap(firstPending, result.merged, loc, result.slotGroups)
      }
    }
  }

  // ── Start Delivery (now shows slot picker first) ──────────────────────────
  const handleStartDelivery = async () => {
    // If already optimized, just go — no need to re-pick
    if (optimized) {
      let loc = driverLocation
      if (!loc) {
        setLocating(true)
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 })
          )
          loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
          setDriverLocation(loc)
        } catch (e: any) {
          setLocationError(e.message ?? "Location access denied")
          setLocating(false)
          return
        }
        setLocating(false)
      }
      setDeliveryStarted(true)
      const firstPending = [...optimizedOrders]
        .sort((a, b) => (a.optimized_sequence ?? 999) - (b.optimized_sequence ?? 999))
        .find((o) => o.status === "pending")
      if (firstPending && onNavigateToMap) {
        onNavigateToMap(firstPending, optimizedOrders, loc, slotGroups)
      }
      return
    }

    // Not yet optimized → show slot picker
    setPendingStartAfterSlotPick(true)
    setShowSlotPicker(true)
  }

  // ── Manual optimize button (also shows slot picker) ──────────────────────
  const handleManualOptimize = () => {
    if (!driverLocation) {
      alert("Please get your location first.")
      return
    }
    setPendingStartAfterSlotPick(false)
    setShowSlotPicker(true)
  }

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowDetailsModal(true)
  }

  const handleDeliveryComplete = (orderId: string) => {
    setShowDetailsModal(false)
    const nextOrder = sortedOrders.find((o) => o.id !== orderId && o.status === "pending")
    if (nextOrder) {
      setSelectedOrder(nextOrder)
      if (deliveryStarted && onNavigateToMap && driverLocation) {
        onNavigateToMap(nextOrder, optimizedOrders.length > 0 ? optimizedOrders : sortedOrders, driverLocation, slotGroups)
      } else {
        setShowDetailsModal(true)
      }
    }
    ;(async () => {
      try {
        await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "delivered" }),
        })
      } finally {
        refresh()
      }
    })()
  }

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading live orders…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-semibold">Error: {String((error as any)?.message ?? error)}</p>
          <Button onClick={refresh} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── Slot Picker Modal (shared) ───────────────────────────────────── */}
      {showSlotPicker && (
        <SlotPickerModal
          availableSlots={availableSlots}
          todayOrders={todayOrders}
          onConfirm={handleSlotConfirm}
          onClose={() => { setShowSlotPicker(false); setPendingStartAfterSlotPick(false) }}
        />
      )}

      {/* ───────────────────────────────────────────────────────────────────
          MOBILE  (< md)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="md:hidden min-h-screen bg-slate-50 flex flex-col">

        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Delivery Dashboard</h1>
              <p className="text-xs text-slate-500">
                {todayISO()} · <span className="text-blue-600 font-medium">{currentSlot()}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refresh} className="p-2 rounded-lg bg-slate-100 active:bg-slate-200">
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
              <DriverProfile />
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
            {[
              { label: "Pending", value: pendingCount, color: "text-orange-600" },
              { label: "Done", value: deliveredCount, color: "text-green-600" },
              { label: "Distance", value: `${totalDistance.toFixed(1)}km`, color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center py-2">
                <span className={`text-lg font-bold leading-tight ${color}`}>{value}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain">
          <div className="px-3 pt-3 pb-8 space-y-3">

            {/* Start Delivery card */}
            <div className={`rounded-xl border-2 p-3 transition-colors ${
              deliveryStarted ? "border-green-400 bg-green-50"
              : optimized ? "border-blue-400 bg-blue-50"
              : "border-slate-200 bg-white"
            }`}>
              {/* Location */}
              <div className="flex items-center gap-2 mb-2">
                {driverLocation ? (
                  <p className="flex-1 text-xs text-green-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Located ({driverLocation.lat.toFixed(3)}, {driverLocation.lng.toFixed(3)})
                  </p>
                ) : (
                  <p className="flex-1 text-xs text-slate-600">Location needed to start</p>
                )}
                <button
                  onClick={handleLocate}
                  disabled={locating}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold ${
                    driverLocation
                      ? "bg-slate-100 text-slate-700 active:bg-slate-200"
                      : "bg-blue-600 text-white active:bg-blue-700"
                  }`}
                >
                  {locating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : driverLocation ? "Re-locate" : "Locate Me"}
                </button>
              </div>

              {locationError && <p className="text-xs text-red-500 mb-2">{locationError}</p>}

              {/* Optimize */}
              <div className="flex items-center gap-2 mb-2">
                {optimized ? (
                  <p className="flex-1 text-xs text-blue-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {pendingCount} stops optimized
                    {optimizedSlot && optimizedSlot !== "all" ? ` · ${slotLabel(optimizedSlot)}` : ""}
                    {geocodeInfo?.success ? ` · ${geocodeInfo.success} geocoded` : ""}
                  </p>
                ) : (
                  <p className="flex-1 text-xs text-slate-600">Optimize route before starting</p>
                )}
                <button
                  onClick={handleManualOptimize}
                  disabled={!driverLocation || optimizing || pendingCount === 0}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold bg-slate-700 text-white active:bg-slate-800 disabled:opacity-40"
                >
                  {optimizing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : optimized ? "Re-optimize" : "Optimize"}
                </button>
              </div>

              {/* CTA */}
              <button
                onClick={handleStartDelivery}
                disabled={locating || optimizing || todayOrders.filter(o => o.status === "pending").length === 0}
                className={`w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 ${
                  deliveryStarted ? "bg-green-600 active:bg-green-700"
                  : optimized ? "bg-blue-600 active:bg-blue-700"
                  : "bg-slate-800 active:bg-slate-900"
                }`}
              >
                {locating || optimizing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{locating ? "Getting location…" : "Optimizing…"}</>
                ) : deliveryStarted ? (
                  <><Navigation className="w-4 h-4" />Continue Navigation</>
                ) : (
                  <><Play className="w-4 h-4" />{optimized ? "Start Delivery" : "Pick Slot & Start"}</>
                )}
              </button>
            </div>

            {/* Delivery Mode */}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "single", label: "Single Rider", color: "bg-green-500" },
                  { value: "multi",  label: "Multi Rider",  color: "bg-purple-500" },
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setDeliveryMode(value as any)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      deliveryMode === value ? `${color} text-white` : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters — collapsible */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Slot & Filters</span>
                {showMobileFilters
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showMobileFilters && (
                <div className="px-3 pb-3 border-t border-slate-100 pt-2 space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedSlot === slot ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {slotLabel(slot)}
                        {slot !== "all" && (
                          <span className="ml-1 opacity-70">
                            {todayOrders.filter((o) =>
                              slot === "no-slot" ? !o.delivery_slot : o.delivery_slot === slot
                            ).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Filter by pincode…"
                      value={pincodeFilter}
                      onChange={(e) => setPincodeFilter(e.target.value)}
                      className="flex-1 h-8 text-sm border-slate-200"
                    />
                    {pincodeFilter && (
                      <button onClick={() => setPincodeFilter("")} className="px-3 rounded-lg bg-slate-100 text-xs text-slate-600">
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Orders list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {optimized
                    ? <>Optimized Route <span className="text-blue-500 font-normal text-xs">({slotLabel(optimizedSlot ?? "all")})</span></>
                    : "Today's Orders"}
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {sortedOrders.length}
                  </span>
                  {optimized && (
                    <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      ✓ Optimized
                    </span>
                  )}
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none"
                >
                  {optimized && <option value="sequence">Optimized</option>}
                  <option value="time">Time</option>
                  <option value="distance">Distance</option>
                  <option value="amount">Amount</option>
                </select>
              </div>

              {sortedOrders.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 py-12 text-center">
                  <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No orders match your filters</p>
                  <p className="text-slate-400 text-xs mt-1">New orders appear here in real-time</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sortedOrders.map((order, index) => (
                    <MobileOrderRow
                      key={order.id}
                      order={order}
                      index={index}
                      optimized={optimized}
                      onSelect={() => handleSelectOrder(order)}
                      onNavigate={() =>
                        driverLocation && onNavigateToMap &&
                        onNavigateToMap(
                          order,
                          optimizedOrders.length > 0 ? optimizedOrders : sortedOrders,
                          driverLocation,
                          slotGroups
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          DESKTOP  (md+)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Delivery Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">
                Today: <span className="font-semibold text-slate-700">{todayISO()}</span>
                &nbsp;·&nbsp;Current slot:{" "}
                <span className="font-semibold text-blue-600">{currentSlot()}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="w-4 h-4 mr-2" />Live Refresh
              </Button>
              <DriverProfile />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending Today", value: pendingCount, icon: <Package className="w-8 h-8 text-blue-400" /> },
              { label: "Delivered", value: deliveredCount, icon: <CheckCircle2 className="w-8 h-8 text-green-400" /> },
              { label: "Est. Distance", value: `${totalDistance.toFixed(1)}km`, icon: <MapPin className="w-8 h-8 text-orange-400" /> },
            ].map(({ label, value, icon }) => (
              <Card key={label} className="bg-white border-slate-200">
                <CardContent className="p-4 flex flex-col items-center md:flex-row md:justify-between gap-2">
                  <div className="text-center md:text-left">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                  </div>
                  {icon}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Route Optimization + Start Delivery */}
          <Card className={`border-2 transition-colors ${
            deliveryStarted ? "border-green-400 bg-green-50"
            : optimized ? "border-blue-400 bg-blue-50"
            : "border-slate-200 bg-white"
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="w-5 h-5" />
                Route Optimization & Delivery Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  {driverLocation ? (
                    <p className="text-sm text-green-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Location: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}
                      <span className="text-xs text-slate-400 ml-1">(±{Math.round(driverLocation.accuracy)}m)</span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">Step 1:</span> Share your current location.
                    </p>
                  )}
                  {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
                </div>
                <Button onClick={handleLocate} disabled={locating} variant={driverLocation ? "outline" : "default"} size="sm">
                  {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  {driverLocation ? "Re-locate" : "Get My Location"}
                </Button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[220px]">
                  {optimized ? (
                    <div className="space-y-0.5">
                      <p className="text-sm text-blue-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Route optimized for{" "}
                        <span className="font-bold">{slotLabel(optimizedSlot ?? "all")}</span>
                        {" "}— {sortedOrders.filter(o => o.status === "pending").length} stops
                      </p>
                      {slotGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {slotGroups.map((g) => (
                            <Badge key={g.slot} className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              {g.slot === "no-slot" ? "Unslotted" : g.slot}: {g.count} orders
                            </Badge>
                          ))}
                        </div>
                      )}
                      {geocodeInfo && geocodeInfo.success > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          📍 {geocodeInfo.success} address{geocodeInfo.success > 1 ? "es" : ""} auto-geocoded
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">Step 2:</span> Pick a delivery slot, then optimize.
                      <span className="block text-xs text-slate-400 mt-0.5">Only orders from that slot will be routed.</span>
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleManualOptimize}
                  disabled={!driverLocation || optimizing || todayOrders.filter(o => o.status === "pending").length === 0}
                  variant={optimized ? "outline" : "secondary"}
                  size="sm"
                >
                  {optimizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Route className="w-4 h-4 mr-2" />}
                  {optimized ? "Re-optimize (new slot)" : "Pick Slot & Optimize"}
                </Button>
              </div>

              <div className="border-t border-slate-200" />

              <Button
                onClick={handleStartDelivery}
                disabled={locating || optimizing || todayOrders.filter(o => o.status === "pending").length === 0}
                className={`w-full text-base font-semibold h-14 transition-all ${
                  deliveryStarted ? "bg-green-600 hover:bg-green-700"
                  : optimized ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                  : "bg-slate-700 hover:bg-slate-800"
                }`}
              >
                {locating || optimizing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{locating ? "Getting location…" : "Optimizing route…"}</>
                ) : deliveryStarted ? (
                  <><Navigation className="w-5 h-5 mr-2" />Continue Navigation</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" />{optimized ? "Start Delivery →" : "Pick Slot & Start Delivery →"}</>
                )}
              </Button>
              <p className="text-xs text-center text-slate-400">
                {!driverLocation && !optimized
                  ? "Will ask which slot → get location → optimize → open map navigation"
                  : !optimized
                  ? "Will ask which slot → optimize route → open map navigation"
                  : `Navigating ${slotLabel(optimizedSlot ?? "all")} orders`}
              </p>
            </CardContent>
          </Card>

          {/* Delivery Mode */}
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Delivery Mode</p>
                <Badge variant="outline">{deliveryMode === "single" ? "Single Rider" : "Multi Rider"}</Badge>
              </div>
              <Tabs value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as "single" | "multi")}>
                <TabsList className="grid grid-cols-2 w-full bg-slate-100">
                  <TabsTrigger value="single" className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-sm">
                    <Package className="w-4 h-4 mr-2" />Single Person
                  </TabsTrigger>
                  <TabsTrigger value="multi" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-sm">
                    <Navigation className="w-4 h-4 mr-2" />Multi Person
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Slot Filter */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />Filter by Delivery Slot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    size="sm"
                    variant={selectedSlot === slot ? "default" : "outline"}
                    onClick={() => setSelectedSlot(slot)}
                    className={`${selectedSlot === slot ? "bg-blue-600" : ""} relative`}
                  >
                    {slotLabel(slot)}
                    {slot !== "all" && slot === currentSlot() && (
                      <span className="ml-1.5 text-xs opacity-80">← now</span>
                    )}
                    {slot !== "all" && (
                      <span className="ml-1.5 bg-white/20 text-xs rounded-full px-1.5">
                        {todayOrders.filter((o) =>
                          slot === "no-slot" ? !o.delivery_slot : o.delivery_slot === slot
                        ).length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by pincode…"
                  value={pincodeFilter}
                  onChange={(e) => setPincodeFilter(e.target.value)}
                  className="border-slate-300 flex-1"
                />
                <Button variant="outline" onClick={() => setPincodeFilter("")}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {optimized
                    ? <>Optimized Route <span className="text-blue-500 font-normal text-base">({slotLabel(optimizedSlot ?? "all")})</span></>
                    : "Today's Orders"}
                </h2>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">{sortedOrders.length} orders</Badge>
                {optimized && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">✓ Mapbox Optimized</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {optimized && <option value="sequence">Optimized Sequence</option>}
                  <option value="time">Order Time</option>
                  <option value="distance">Distance</option>
                  <option value="amount">Amount</option>
                </select>
              </div>
            </div>

            {sortedOrders.length === 0 ? (
              <Card className="bg-white border-slate-200">
                <CardContent className="py-16 text-center">
                  <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No orders match your filters</p>
                  <p className="text-slate-400 text-sm mt-1">New orders appear here in real-time</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedOrders.map((order, index) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    priority={optimized ? (order.optimized_sequence ?? index) + 1 : index + 1}
                    onSelect={() => handleSelectOrder(order)}
                    onNavigate={() =>
                      driverLocation && onNavigateToMap &&
                      onNavigateToMap(
                        order,
                        optimizedOrders.length > 0 ? optimizedOrders : sortedOrders,
                        driverLocation,
                        slotGroups
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal — shared across both layouts */}
      {selectedOrder && (
        <DeliveryDetailsModal
          order={selectedOrder}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onDeliveryComplete={() => handleDeliveryComplete(selectedOrder.id)}
        />
      )}
    </>
  )
}