// app/api/optimize-route/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/optimize-route
//
// Flow:
//   1. Receive orders (may have address only, no lat/lng)
//   2. Auto-geocode any orders missing lat/lng via Mapbox Geocoding API
//   3. Save geocoded coords back to Supabase
//   4. Run Mapbox Optimization API on all coords
//   5. Save optimized_sequence back to Supabase
//   6. Return { optimizedIds, coordsMap, geocodedCount } to client
//
// Body:
//   {
//     origin: { lat: number, lng: number }
//     orders: Array<{
//       id: string
//       lat?: number        ← optional, will geocode if missing
//       lng?: number        ← optional, will geocode if missing
//       address?: string    ← used for geocoding if no lat/lng
//       city?: string
//       state?: string
//       zip_code?: string
//     }>
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server"

const MAPBOX_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

const ORDERS_TABLE = process.env.SUPABASE_ORDERS_TABLE || "orders"

// Max waypoints per Mapbox Optimization call (1 origin + 11 stops = 12 total)
const MAX_WAYPOINTS = 11

// ─── Types ────────────────────────────────────────────────────────────────────
interface OrderInput {
  id: string
  lat?: number
  lng?: number
  address?: string
  city?: string
  state?: string
  zip_code?: string
}

interface OrderWithCoords extends OrderInput {
  lat: number
  lng: number
}

// ─── Supabase REST helper ─────────────────────────────────────────────────────
function sbHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: "return=minimal",
  }
}

async function saveCoords(id: string, lat: number, lng: number) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${ORDERS_TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: sbHeaders(),
      body: JSON.stringify({
        delivery_lat: lat,
        delivery_lng: lng,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn(`[saveCoords] Failed for order ${id}:`, e)
  }
}

async function saveSequence(id: string, seq: number) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${ORDERS_TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: sbHeaders(),
      body: JSON.stringify({
        optimized_sequence: seq,
        updated_at: new Date().toISOString(),
      }),
    })
  } catch (e) {
    console.warn(`[saveSequence] Failed for order ${id}:`, e)
  }
}

// ─── Mapbox Geocoding ─────────────────────────────────────────────────────────
async function geocodeAddress(order: OrderInput): Promise<{ lat: number; lng: number } | null> {
  // Build address string — most specific to least specific
  const parts = [
    order.address,
    order.city,
    order.state,
    order.zip_code,
    "India",
  ].filter(Boolean)

  if (parts.length < 2) {
    console.warn(`[geocode] Order ${order.id} has insufficient address data:`, parts)
    return null
  }

  const query = encodeURIComponent(parts.join(", "))

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json` +
        `?country=IN` +
        `&proximity=77.2090,28.6139` +   // bias toward Delhi
        `&limit=1` +
        `&access_token=${MAPBOX_TOKEN}`
    )

    if (!res.ok) {
      console.warn(`[geocode] HTTP ${res.status} for order ${order.id}`)
      return null
    }

    const data = await res.json()
    const feature = data.features?.[0]

    if (!feature) {
      console.warn(`[geocode] No result for: ${decodeURIComponent(query)}`)
      return null
    }

    const [lng, lat] = feature.center
    console.log(
      `[geocode] ${order.id} → "${feature.place_name}" → [${lat}, ${lng}]`
    )
    return { lat, lng }
  } catch (err) {
    console.error(`[geocode] Error for order ${order.id}:`, err)
    return null
  }
}

// ─── Mapbox Optimization API ──────────────────────────────────────────────────
async function optimizeChunk(
  origin: { lat: number; lng: number },
  chunk: OrderWithCoords[]
): Promise<string[]> {
  const coords = [
    `${origin.lng},${origin.lat}`,
    ...chunk.map((o) => `${o.lng},${o.lat}`),
  ].join(";")

  const url =
    `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}` +
    `?roundtrip=false&source=first&destination=last&overview=false&access_token=${MAPBOX_TOKEN}`

  const res = await fetch(url)

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Mapbox Optimization error (${res.status}): ${text}`)
  }

  const data = await res.json()

  if (data.code !== "Ok") {
    throw new Error(`Mapbox Optimization code: ${data.code} — ${data.message ?? ""}`)
  }

  // waypoints[0] = origin (skip). Sort rest by trips_index for visit order.
  const orderedIndices: number[] = data.waypoints
    .filter((w: any) => w.waypoint_index > 0)
    .sort((a: any, b: any) => a.trips_index - b.trips_index || a.waypoint_index - b.waypoint_index)
    .map((w: any) => w.waypoint_index - 1) // 0-based chunk index

  return orderedIndices.map((idx) => chunk[idx].id)
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!MAPBOX_TOKEN) {
    return NextResponse.json(
      { error: "MAPBOX_ACCESS_TOKEN is not configured on the server" },
      { status: 500 }
    )
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured" },
      { status: 500 }
    )
  }

  let body: { origin: { lat: number; lng: number }; orders: OrderInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { origin, orders } = body

  if (!origin?.lat || !origin?.lng) {
    return NextResponse.json({ error: "Missing or invalid origin coordinates" }, { status: 400 })
  }
  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: "No orders provided" }, { status: 400 })
  }

  // ── Step 1: Geocode orders missing lat/lng ────────────────────────────────
  // Process in batches of 5 to avoid Mapbox rate limits
  const geocodedCount = { success: 0, failed: 0 }
  const ordersWithCoords: OrderWithCoords[] = []
  const BATCH_SIZE = 5

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (order) => {
        // Already has valid coords — use directly
        if (order.lat && order.lng && !isNaN(order.lat) && !isNaN(order.lng)) {
          ordersWithCoords.push(order as OrderWithCoords)
          return
        }

        // Missing coords — geocode from address
        const coords = await geocodeAddress(order)
        if (coords) {
          // Persist so future optimizations don't re-geocode
          await saveCoords(order.id, coords.lat, coords.lng)
          ordersWithCoords.push({ ...order, lat: coords.lat, lng: coords.lng })
          geocodedCount.success++
        } else {
          console.warn(`[optimize-route] Skipping order ${order.id} — geocoding failed`)
          geocodedCount.failed++
        }
      })
    )
  }

  if (ordersWithCoords.length === 0) {
    return NextResponse.json(
      {
        error:
          "Could not geocode any order addresses. Make sure orders have a valid address, city, or zip_code.",
        geocodedCount,
      },
      { status: 422 }
    )
  }

  // ── Step 2: Chunk + Optimize via Mapbox ──────────────────────────────────
  const chunks: OrderWithCoords[][] = []
  for (let i = 0; i < ordersWithCoords.length; i += MAX_WAYPOINTS) {
    chunks.push(ordersWithCoords.slice(i, i + MAX_WAYPOINTS))
  }

  let globalSequence: string[] = []

  for (const chunk of chunks) {
    if (chunk.length === 1) {
      // No optimization needed for a single stop
      globalSequence.push(chunk[0].id)
      continue
    }

    try {
      const result = await optimizeChunk(origin, chunk)
      globalSequence = [...globalSequence, ...result]
    } catch (err: any) {
      console.error("[optimize-route] Optimization failed for chunk:", err.message)
      // Fallback: sort by straight-line distance from origin
      const fallback = [...chunk].sort((a, b) => {
        const dA = Math.hypot(a.lat - origin.lat, a.lng - origin.lng)
        const dB = Math.hypot(b.lat - origin.lat, b.lng - origin.lng)
        return dA - dB
      })
      globalSequence = [...globalSequence, ...fallback.map((o) => o.id)]
    }
  }

  // ── Step 3: Save optimized_sequence to Supabase ───────────────────────────
  await Promise.all(globalSequence.map((id, seq) => saveSequence(id, seq)))

  // ── Step 4: Build coordsMap so client can update order state immediately ──
  // (avoids a full refetch just to get the new lat/lng values)
  const coordsMap: Record<string, { lat: number; lng: number }> = {}
  for (const o of ordersWithCoords) {
    coordsMap[o.id] = { lat: o.lat, lng: o.lng }
  }

  return NextResponse.json({
    optimizedIds: globalSequence,
    coordsMap,
    geocodedCount,
    totalOptimized: globalSequence.length,
    skipped: geocodedCount.failed,
  })
}