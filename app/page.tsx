// // /* eslint-disable @typescript-eslint/no-explicit-any */
// // "use client"
// // import { useState, useEffect } from "react"
// // import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// // import DeliveryDashboard from "@/components/delivery-dashboard"
// // import MapView from "@/components/map-view"
// // import LiveTracking from "@/components/live-tracking"
// // import { Map, LayoutGrid, Navigation } from "lucide-react"
// // import useOrders from "@/lib/useOrders"
// // import AuthPage from "@/components/auth"
// // import { supabase } from "@/lib/supabaseClient"


// // export default function App() {
// //   const [user, setUser] = useState<any>(null)

// //   useEffect(() => {
// //     let mounted = true

// //     const init = async () => {
// //       try {
// //         const { data } = await supabase.auth.getSession()
// //         if (!mounted) return
// //         setUser(data?.session?.user ?? null)
// //       } catch (e) {
// //         console.error('Error getting session', e)
// //       }
// //     }

// //     init()

// //     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
// //       setUser(session?.user ?? null)
// //     })

// //     return () => {
// //       mounted = false
// //       if (listener && typeof listener.subscription?.unsubscribe === 'function') listener.subscription.unsubscribe()
// //     }
// //   }, [])

// //   if (!user) return <AuthPage onAuthSuccess={setUser} />

// //   return <DeliveryDashboard user={user} />
// // }

// // export function Home() {
// //   const [selectedZone, setSelectedZone] = useState("rajiv-chowk")
// //   const [activeTab, setActiveTab] = useState("dashboard")
// //   const { orders = [], loading, error } = useOrders()
// //   const [selectedOrder, setSelectedOrder] = useState<any>(null)

// //   useEffect(() => {
// //     if (!loading && orders.length > 0) {
// //       // Find first order with valid delivery_zip_code
// //       const validOrder = (orders as any[]).find((o: any) => o.delivery_zip_code)
// //       if (validOrder) setSelectedOrder(validOrder)
// //     }
// //   }, [loading, orders])

// //   // FIXED: Filter orders by selected zone with null checks
// //   const zoneOrders = (orders as any[]).filter((order: any) => {
// //     // Skip orders without delivery_zip_code
// //     if (!order.delivery_zip_code) return false
    
// //     if (selectedZone === "rajiv-chowk" || selectedZone === "connaught-place") {
// //       return order.delivery_zip_code === "110001"
// //     }
// //     if (selectedZone === "kashmere-gate") {
// //       return order.delivery_zip_code === "110006"
// //     }
// //     if (selectedZone === "b-block-sanik") {
// //       return order.delivery_zip_code === "110030"
// //     }
// //     if (selectedZone === "new-delhi") {
// //       return order.delivery_zip_code === "110002"
// //     }
// //     return true
// //   })

// //   // Debug logging
// //   useEffect(() => {
// //     console.log('📊 Page.tsx State:', {
// //       totalOrders: orders.length,
// //       zoneOrders: zoneOrders.length,
// //       selectedZone,
// //       loading,
// //       error: error?.message
// //     })
// //   }, [orders, zoneOrders, selectedZone, loading, error])

// //   return (
// //     <main className="min-h-screen bg-background pb-28 md:pb-20">
// //       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
// //         {/* Top header removed - tabs are available in the footer only */}

// //         <TabsContent value="dashboard" className="m-0">
// //           <DeliveryDashboard
// //             onNavigateToMap={(order: any) => {
// //               setSelectedOrder(order)
// //               setActiveTab("map")
// //             }}
// //           />
// //         </TabsContent>

// //         {/* Footer Tabs: mirrored tabs fixed to viewport bottom for all pages */}
// //         <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 shadow-sm pb-[env(safe-area-inset-bottom)]">
// //           <div className="max-w-7xl mx-auto px-6 md:px-8">
// //             <TabsList className="grid w-full grid-cols-3 bg-transparent rounded-none h-auto p-0">
// //               <TabsTrigger
// //                 value="dashboard"
// //                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
// //               >
// //                 <LayoutGrid className="w-4 h-4" />
// //                 Dashboard
// //               </TabsTrigger>
// //               <TabsTrigger
// //                 value="map"
// //                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
// //               >
// //                 <Map className="w-4 h-4" />
// //                 Map View
// //               </TabsTrigger>
// //               <TabsTrigger
// //                 value="tracking"
// //                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
// //               >
// //                 <Navigation className="w-4 h-4" />
// //                 Live Tracking
// //               </TabsTrigger>
// //             </TabsList>
// //           </div>
// //         </div>

// //         <TabsContent value="map" className="m-0 p-4 md:p-8">
// //           <div className="max-w-7xl mx-auto">
// //             <div className="mb-8">
// //               <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Route Optimization</h1>
// //               <p className="text-slate-600">View and optimize your delivery routes</p>
// //             </div>
// //             {loading ? (
// //               <div className="text-center py-12 text-slate-600">Loading orders...</div>
// //             ) : zoneOrders.length === 0 ? (
// //               <div className="text-center py-12 text-slate-600">No orders available for map view</div>
// //             ) : (
// //               <MapView orders={zoneOrders} selectedZone={selectedZone} selectedOrder={selectedOrder} />
// //             )}
// //           </div>
// //         </TabsContent>

// //         <TabsContent value="tracking" className="m-0 p-4 md:p-8">
// //           <div className="max-w-7xl mx-auto">
// //             <div className="mb-8">
// //               <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Live Tracking</h1>
// //               <p className="text-slate-600">Track delivery in real-time</p>
// //             </div>
// //             {loading ? (
// //               <div className="text-center py-12 text-slate-600">Loading order...</div>
// //             ) : !selectedOrder ? (
// //               <div className="text-center py-12 text-slate-600">No order selected</div>
// //             ) : (
// //               <LiveTracking
// //                 order={selectedOrder}
// //                 onStatusChange={(status: any) => {
// //                   setSelectedOrder({ ...selectedOrder, status })
// //                 }}
// //               />
// //             )}
// //           </div>
// //         </TabsContent>
// //       </Tabs>
// //     </main>
// //   )
// // }



// /* eslint-disable @typescript-eslint/no-explicit-any */
// "use client"
// import { useState, useEffect } from "react"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import DeliveryDashboard from "@/components/delivery-dashboard"
// import MapView from "@/components/map-view"
// import LiveTracking from "@/components/live-tracking"
// import { Map, LayoutGrid, Navigation } from "lucide-react"
// import AuthPage from "@/components/auth"
// import { supabase } from "@/lib/supabaseClient"
// import type { Order, DriverLocation } from "@/components/delivery-dashboard"

// // SlotGroup type (mirrors what API returns)
// interface SlotGroup {
//   slot: string
//   count: number
//   ids: string[]
// }

// export default function App() {
//   // ── Auth ───────────────────────────────────────────────────────────────────
//   const [user, setUser] = useState<any>(null)
//   const [authLoading, setAuthLoading] = useState(true)

//   useEffect(() => {
//     let mounted = true
//     supabase.auth.getSession().then(({ data }) => {
//       if (mounted) {
//         setUser(data?.session?.user ?? null)
//         setAuthLoading(false)
//       }
//     })
//     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
//       setUser(session?.user ?? null)
//     })
//     return () => {
//       mounted = false
//       listener?.subscription?.unsubscribe()
//     }
//   }, [])

//   // ── Navigation state ───────────────────────────────────────────────────────
//   const [activeTab, setActiveTab] = useState("dashboard")

//   // Everything the map needs — set by handleNavigateToMap
//   const [mapFirstOrder,    setMapFirstOrder]    = useState<Order | null>(null)
//   const [mapAllOrders,     setMapAllOrders]     = useState<Order[]>([])
//   const [mapDriverLoc,     setMapDriverLoc]     = useState<DriverLocation | undefined>(undefined)
//   const [mapSlotGroups,    setMapSlotGroups]    = useState<SlotGroup[]>([])

//   // ── Called by dashboard "Start Delivery" button ────────────────────────────
//   // Receives the full optimized order list + driver location from the dashboard
//   // then switches straight to the map tab — driver sees the map immediately
//   const handleNavigateToMap = (
//     firstOrder: Order,
//     allOrders: Order[],
//     driverLocation: DriverLocation,
//     slotGroups?: SlotGroup[]
//   ) => {
//     setMapFirstOrder(firstOrder)
//     setMapAllOrders(allOrders)
//     setMapDriverLoc(driverLocation)
//     setMapSlotGroups(slotGroups ?? [])
//     setActiveTab("map")          // ← switches tab to map automatically
//   }

//   // ── Mark delivered (called from map HUD "Mark as Delivered") ───────────────
//   const handleDeliveryComplete = async (orderId: string) => {
//     try {
//       await fetch(`/api/orders/${orderId}`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ status: "delivered" }),
//       })
//       // Remove the delivered order from the map list
//       setMapAllOrders((prev) =>
//         prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" as const } : o))
//       )
//     } catch (e) {
//       console.error("[page] delivery complete error:", e)
//     }
//   }

//   // ── Auth guard ─────────────────────────────────────────────────────────────
//   if (authLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
//       </div>
//     )
//   }

//   if (!user) return <AuthPage onAuthSuccess={setUser} />

//   // ── App ────────────────────────────────────────────────────────────────────
//   return (
//     <main className="min-h-screen bg-background pb-[72px]">
//       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

//         {/* ── Dashboard tab ── */}
//         <TabsContent value="dashboard" className="m-0">
//           <DeliveryDashboard
//             onNavigateToMap={handleNavigateToMap}
//           />
//         </TabsContent>

//         {/* ── Map tab ── */}
//         <TabsContent value="map" className="m-0">
//           {/* 
//             Full-screen map in navigation mode:
//             - Shows all optimized stops as numbered markers coloured by slot
//             - Bottom HUD shows current stop info, ETA, "Mark Delivered"
//             - GPS tracks driver live, auto-reroutes if off path
//             - When no delivery is started yet, shows the plain route summary view
//           */}
//           <MapView
//             // Optimized delivery props (filled when driver clicks Start Delivery)
//             optimizedOrders={mapAllOrders}
//             driverLocation={mapDriverLoc}
//             slotGroups={mapSlotGroups}
//             onDeliveryComplete={handleDeliveryComplete}
//             // Legacy / browse props (used before delivery starts)
//             selectedOrder={mapFirstOrder ?? undefined}
//           />
//         </TabsContent>

//         {/* ── Live Tracking tab ── */}
//         <TabsContent value="tracking" className="m-0 p-4 md:p-8">
//           <div className="max-w-7xl mx-auto">
//             <div className="mb-8">
//               <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Live Tracking</h1>
//               <p className="text-slate-600">Track delivery in real-time</p>
//             </div>
//             {mapFirstOrder ? (
//               <LiveTracking
//                 order={mapFirstOrder}
//                 onStatusChange={(status: any) =>
//                   setMapFirstOrder((o) => (o ? { ...o, status } : o))
//                 }
//               />
//             ) : (
//               <div className="text-center py-12 text-slate-600">
//                 Start a delivery from the Dashboard first
//               </div>
//             )}
//           </div>
//         </TabsContent>

//         {/* ── Bottom tab bar (fixed) ── */}
//         <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 shadow-sm pb-[env(safe-area-inset-bottom)]">
//           <div className="max-w-7xl mx-auto px-6 md:px-8">
//             <TabsList className="grid w-full grid-cols-3 bg-transparent rounded-none h-auto p-0">
//               <TabsTrigger
//                 value="dashboard"
//                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
//               >
//                 <LayoutGrid className="w-4 h-4" />
//                 Dashboard
//               </TabsTrigger>
//               <TabsTrigger
//                 value="map"
//                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
//               >
//                 <Map className="w-4 h-4" />
//                 Map View
//               </TabsTrigger>
//               <TabsTrigger
//                 value="tracking"
//                 className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
//               >
//                 <Navigation className="w-4 h-4" />
//                 Live Tracking
//               </TabsTrigger>
//             </TabsList>
//           </div>
//         </div>

//       </Tabs>
//     </main>
//   )
// }



/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DeliveryDashboard from "@/components/delivery-dashboard"
import MapView from "@/components/map-view"
import LiveTracking from "@/components/live-tracking"
import { Map, LayoutGrid, Navigation } from "lucide-react"
import AuthPage from "@/components/auth"
import { supabase } from "@/lib/supabaseClient"
import type { Order, DriverLocation } from "@/components/delivery-dashboard"

// SlotGroup type (mirrors what API returns)
interface SlotGroup {
  slot: string
  count: number
  ids: string[]
}

export default function App() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data?.session?.user ?? null)
        setAuthLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  // ── Navigation state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dashboard")

  // Everything the map needs — set by handleNavigateToMap
  const [mapFirstOrder,    setMapFirstOrder]    = useState<Order | null>(null)
  const [mapAllOrders,     setMapAllOrders]     = useState<Order[]>([])
  const [mapDriverLoc,     setMapDriverLoc]     = useState<DriverLocation | undefined>(undefined)
  const [mapSlotGroups,    setMapSlotGroups]    = useState<SlotGroup[]>([])

  // ── Called by dashboard "Start Delivery" button ────────────────────────────
  // Receives the full optimized order list + driver location from the dashboard
  // then switches straight to the map tab — driver sees the map immediately
  const handleNavigateToMap = (
    firstOrder: Order,
    allOrders: Order[],
    driverLocation: DriverLocation,
    slotGroups?: SlotGroup[]
  ) => {
    setMapFirstOrder(firstOrder)
    setMapAllOrders(allOrders)
    setMapDriverLoc(driverLocation)
    setMapSlotGroups(slotGroups ?? [])
    setActiveTab("map")          // ← switches tab to map automatically
  }

  // ── Mark delivered (called from map HUD "Mark as Delivered") ───────────────
  const handleDeliveryComplete = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      })
      // Remove the delivered order from the map list
      setMapAllOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" as const } : o))
      )
    } catch (e) {
      console.error("[page] delivery complete error:", e)
    }
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthPage onAuthSuccess={setUser} />

  // ── App ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background pb-[72px]">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* ── Dashboard tab ── */}
        <TabsContent value="dashboard" className="m-0">
          <DeliveryDashboard
            onNavigateToMap={handleNavigateToMap}
          />
        </TabsContent>

        {/* ── Map tab ──
            IMPORTANT: we render MapView outside TabsContent so it is NEVER
            unmounted. Unmounting destroys the Mapbox GL context. We instead
            toggle visibility with CSS so the canvas stays alive.
        ── */}
        <div style={{ display: activeTab === "map" ? "block" : "none" }}>
          <MapView
            optimizedOrders={mapAllOrders}
            driverLocation={mapDriverLoc}
            slotGroups={mapSlotGroups}
            onDeliveryComplete={handleDeliveryComplete}
            selectedOrder={mapFirstOrder ?? undefined}
            isVisible={activeTab === "map"}
          />
        </div>

        {/* ── Live Tracking tab ── */}
        <TabsContent value="tracking" className="m-0 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Live Tracking</h1>
              <p className="text-slate-600">Track delivery in real-time</p>
            </div>
            {mapFirstOrder ? (
              <LiveTracking
                order={mapFirstOrder}
                onStatusChange={(status: any) =>
                  setMapFirstOrder((o) => (o ? { ...o, status } : o))
                }
              />
            ) : (
              <div className="text-center py-12 text-slate-600">
                Start a delivery from the Dashboard first
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Bottom tab bar (fixed) ── */}
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 shadow-sm pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-6 md:px-8">
            <TabsList className="grid w-full grid-cols-3 bg-transparent rounded-none h-auto p-0">
              <TabsTrigger
                value="dashboard"
                className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger
                value="map"
                className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
              >
                <Map className="w-4 h-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger
                value="tracking"
                className="rounded-none border-t-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Live Tracking
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

      </Tabs>
    </main>
  )
}