"use client"

// ─── arrival-modal.tsx ────────────────────────────────────────────────────────
// Full-screen delivery confirmation card shown when driver arrives at a stop.
// Fetches order_items + products from Supabase using the exact schema:
//   orders → order_items (order_id, product_id, quantity, price)
//          → products    (id, title, image, unit)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Phone, Package, User, CheckCircle2, X,
  ChevronRight, ShoppingBag, AlertTriangle, Clock,
  MapPin, Loader2,
} from "lucide-react"
// import {createClient } from "@/lib/supabaseClient"
import { supabase } from "@/lib/supabaseClient"
import { slotColor, slotLabel } from "./delivery-types"
import type { Order } from "./delivery-types"

// ─── Types matching the Supabase schema ──────────────────────────────────────
interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number             // price per unit at time of order
  products: {              // joined from products table
    title: string
    image: string | null
    unit: string | null
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ArrivalModalProps {
  order: Order
  stopNumber: number
  totalStops: number
  onConfirm: () => void
  onDismiss: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────
const HOLD_MS = 1500

// ─── Component ────────────────────────────────────────────────────────────────
export default function ArrivalModal({
  order,
  stopNumber,
  totalStops,
  onConfirm,
  onDismiss,
}: ArrivalModalProps) {
  // ── Hold-to-confirm state ────────────────────────────────────────────────────
  const [holding,   setHolding]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const holdTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStart  = useRef<number>(0)

  // ── Supabase fetch state ─────────────────────────────────────────────────────
  const [orderItems,  setOrderItems]  = useState<OrderItem[]>([])
  const [fetchState,  setFetchState]  = useState<"loading" | "done" | "error">("loading")
// const { data, error } = await supabase
  const isCOD = order.payment_method?.toLowerCase().includes("cod")

  // ── Fetch order_items joined with products on mount ──────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // export const supabase = createClient(url, key)
        const { data, error } = await supabase
          .from("order_items")
          .select(`
            id,
            order_id,
            product_id,
            quantity,
            price,
            products (
              title,
              image,
              unit
            )
          `)
          .eq("order_id", order.id)

        if (cancelled) return
        if (error) throw error

        // Supabase returns products as an object (one-to-one via FK)
        // Cast it correctly — it comes back as an object, not an array
        const normalised: OrderItem[] = (data ?? []).map((row: any) => ({
          ...row,
          products: Array.isArray(row.products) ? row.products[0] : row.products,
        }))

        setOrderItems(normalised)
        setFetchState("done")
      } catch (err) {
        console.error("[ArrivalModal] Failed to fetch order items:", err)
        if (!cancelled) setFetchState("error")
      }
    }
    load()
    return () => { cancelled = true }
  }, [order.id])

  // ── Hold-to-confirm logic ────────────────────────────────────────────────────
  const startHold = useCallback(() => {
    if (confirmed) return
    holdStart.current = Date.now()
    setHolding(true)
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current
      const pct = Math.min((elapsed / HOLD_MS) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        clearInterval(holdTimer.current!)
        setConfirmed(true)
        setHolding(false)
        setTimeout(onConfirm, 700)
      }
    }, 30)
  }, [confirmed, onConfirm])

  const endHold = useCallback(() => {
    if (confirmed) return
    clearInterval(holdTimer.current!)
    setHolding(false)
    setProgress(0)
  }, [confirmed])

  useEffect(() => () => { clearInterval(holdTimer.current!) }, [])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)" }}
    >
      {/* Arrived pulse */}
      <div className="flex justify-center pt-7 pb-2">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 rounded-full bg-green-500 opacity-20 animate-ping" />
          <div className="absolute w-16 h-16 rounded-full bg-green-500 opacity-25 animate-ping"
            style={{ animationDelay: "0.3s" }} />
          <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/50">
            <MapPin className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-3">
        <p className="text-white font-black text-2xl tracking-tight">You've Arrived!</p>
        <p className="text-green-400 text-sm font-medium mt-0.5">
          Stop {stopNumber} of {totalStops} — verify &amp; confirm below
        </p>
      </div>

      {/* Scrollable card */}
      <div className="mx-3 flex-1 overflow-y-auto pb-2">
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

          {/* ── Dark header: customer name + address + call ── */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-xl leading-tight truncate">
                    {order.name ?? "Customer"}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-snug line-clamp-2">
                    {[order.address, order.city].filter(Boolean).join(", ") || "No address on file"}
                  </p>
                </div>
              </div>
              <button onClick={onDismiss}
                className="text-slate-500 hover:text-white transition-colors p-1 shrink-0 -mt-0.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Call button */}
            {order.phone ? (
              <a
                href={`tel:${order.phone}`}
                className="flex items-center gap-3 bg-green-500 hover:bg-green-400
                  active:scale-95 rounded-2xl px-4 py-3 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-lg leading-none tracking-wide">
                    {order.phone}
                  </p>
                  <p className="text-green-100 text-xs mt-0.5">Tap to call customer</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
              </a>
            ) : (
              <div className="flex items-center gap-3 bg-slate-700 rounded-2xl px-4 py-3">
                <Phone className="w-5 h-5 text-slate-500" />
                <p className="text-slate-400 text-sm">No phone number on file</p>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="px-5 pt-4 pb-2">

            {/* Row: item count label + total */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {fetchState === "loading"
                    ? "Loading items…"
                    : `${orderItems.length} Item${orderItems.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <span className="text-xl font-black text-slate-900">₹{order.total ?? 0}</span>
            </div>

            {/* ── Items list ── */}
            {fetchState === "loading" && (
              <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Fetching items…</span>
              </div>
            )}

            {fetchState === "error" && (
              <div className="flex items-center gap-3 bg-red-50 rounded-xl px-4 py-3 mb-4">
                <Package className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-600 text-sm font-medium">
                  Could not load items — verify bag with customer
                </p>
              </div>
            )}

            {fetchState === "done" && orderItems.length > 0 && (
              <div className="space-y-2 mb-4">
                {orderItems.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5">

                    {/* Product image or fallback icon */}
                    {item.products?.image ? (
                      <img
                        src={item.products.image}
                        alt={item.products.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-slate-200"
                        onError={(e) => {
                          // If image fails to load, swap to a package icon
                          const el = e.currentTarget
                          el.style.display = "none"
                          el.nextElementSibling?.classList.remove("hidden")
                        }}
                      />
                    ) : null}
                    {/* Icon shown when no image or image fails */}
                    <div className={`w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 ${item.products?.image ? "hidden" : ""}`}>
                      <Package className="w-5 h-5 text-blue-500" />
                    </div>

                    {/* Title + unit */}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold text-sm leading-tight truncate">
                        {item.products?.title ?? "Unknown product"}
                      </p>
                      {item.products?.unit && (
                        <p className="text-slate-400 text-xs mt-0.5">{item.products.unit}</p>
                      )}
                    </div>

                    {/* Qty badge + line price */}
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {/* Qty circle — driver physically counts bags */}
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-black text-sm leading-none">
                            {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs font-medium">
                        ₹{(item.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fetchState === "done" && orderItems.length === 0 && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 mb-4">
                <Package className="w-6 h-6 text-slate-400 shrink-0" />
                <div>
                  <p className="text-slate-700 font-bold text-sm">1 Package</p>
                  <p className="text-slate-400 text-xs mt-0.5">Verify contents with customer</p>
                </div>
              </div>
            )}

            {/* ── Payment banner ── */}
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 ${
              isCOD
                ? "bg-amber-50 border-2 border-amber-300"
                : "bg-green-50 border-2 border-green-300"
            }`}>
              <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${
                isCOD ? "text-amber-500" : "text-green-500"
              }`} />
              <div>
                <p className={`font-black text-base leading-tight ${
                  isCOD ? "text-amber-800" : "text-green-800"
                }`}>
                  {isCOD ? `💵 Collect ₹${order.total ?? 0} CASH` : "✅ Already Paid Online"}
                </p>
                <p className={`text-xs mt-1 leading-snug ${
                  isCOD ? "text-amber-700" : "text-green-700"
                }`}>
                  {isCOD
                    ? "Take the money BEFORE giving the bag"
                    : "No payment needed — just hand over the bag"}
                </p>
              </div>
            </div>

            {/* ── Delivery slot ── */}
            {order.delivery_slot && (
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">
                  Slot:{" "}
                  <span
                    className="font-bold px-2 py-0.5 rounded-full text-white text-xs"
                    style={{ background: slotColor(order.delivery_slot) }}
                  >
                    {slotLabel(order.delivery_slot)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* ── Hold-to-confirm ── */}
          <div className="px-4 pb-5">
            {confirmed ? (
              <div className="flex items-center justify-center gap-3 py-4 bg-green-500 rounded-2xl">
                <CheckCircle2 className="w-7 h-7 text-white" />
                <span className="text-white font-black text-xl">Delivered! ✓</span>
              </div>
            ) : (
              <>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${progress}%`,
                      transition: holding ? "none" : "width 0.1s ease",
                    }}
                  />
                </div>
                <button
                  onMouseDown={startHold}
                  onMouseUp={endHold}
                  onMouseLeave={endHold}
                  onTouchStart={startHold}
                  onTouchEnd={endHold}
                  onTouchCancel={endHold}
                  className={`w-full py-4 rounded-2xl font-black text-lg flex items-center
                    justify-center gap-3 select-none transition-all duration-150 ${
                    holding
                      ? "bg-green-500 text-white scale-[0.98] shadow-lg shadow-green-200"
                      : "bg-green-600 text-white hover:bg-green-500 active:scale-95"
                  }`}
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                >
                  <CheckCircle2 className={`w-6 h-6 ${holding ? "animate-pulse" : ""}`} />
                  {holding ? "Keep holding…" : "Hold to Confirm Delivery"}
                </button>
                <p className="text-center text-xs text-slate-400 mt-1.5">
                  Hold for {HOLD_MS / 1000}s to prevent accidental marks
                </p>
              </>
            )}

            <button
              onClick={onDismiss}
              className="w-full mt-2.5 py-3 rounded-2xl text-slate-500 text-sm font-semibold
                border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Not here yet — go back to map
            </button>
          </div>

        </div>
      </div>

      <div className="h-4 shrink-0" />
    </div>
  )
}