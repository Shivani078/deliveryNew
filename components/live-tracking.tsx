"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navigation, Clock, AlertCircle, CheckCircle2, Loader } from "lucide-react"

type TrackingOrder = {
  status?: string;
  distance?: number;
};

type LiveTrackingProps = {
  order: TrackingOrder | null;
  onStatusChange: (status: string) => void;
};

export default function LiveTracking({ order, onStatusChange }: LiveTrackingProps) {
  const [currentLocation, setCurrentLocation] = useState({ lat: 28.6139, lng: 77.209 })
  const [deliveryStatus, setDeliveryStatus] = useState(order?.status || "pending")
  const [isTracking, setIsTracking] = useState(false)
  const [trackingHistory, setTrackingHistory] = useState([
    {
      timestamp: new Date(Date.now() - 10 * 60000),
      status: "pending",
      location: "Warehouse",
      message: "Order picked up from warehouse",
    },
  ])
  const [eta, setEta] = useState<Date | null>(null)

  useEffect(() => {
    if (!isTracking) return

    const interval = setInterval(() => {
      // Simulate movement towards delivery location
      setCurrentLocation((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }))

      // Simulate status updates
      if (Math.random() > 0.7) {
        const statuses = ["pending", "in-progress", "nearby", "delivered"]
        const currentIndex = statuses.indexOf(deliveryStatus)
        if (currentIndex < statuses.length - 1) {
          const newStatus = statuses[currentIndex + 1]
          setDeliveryStatus(newStatus)
          onStatusChange?.(newStatus)

          const messages: Record<string, string> = {
            "in-progress": "Delivery partner is on the way",
            nearby: "Delivery partner is nearby",
            delivered: "Order delivered successfully",
          }

          setTrackingHistory((prev) => [
            ...prev,
            {
              timestamp: new Date(),
              status: newStatus,
              location: "En route",
              message: messages[newStatus] || "Status updated",
            },
          ])
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [isTracking, deliveryStatus, onStatusChange])

  useEffect(() => {
    if (order?.distance) {
      const estimatedMinutes = Math.ceil((order.distance / 30) * 60)
      const etaTime = new Date(Date.now() + estimatedMinutes * 60000)
      setEta(etaTime)
    }
  }, [order?.distance])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "nearby":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-slate-100 text-slate-800 border-slate-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "in-progress":
        return <Navigation className="w-4 h-4" />
      case "nearby":
        return <AlertCircle className="w-4 h-4" />
      case "delivered":
        return <CheckCircle2 className="w-4 h-4" />
      default:
        return <Loader className="w-4 h-4 animate-spin" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Live Map */}
      <Card className="bg-white border-slate-200 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900">Live Location</CardTitle>
            <Badge className={`border ${getStatusColor(deliveryStatus)} flex items-center gap-1`}>
              {getStatusIcon(deliveryStatus)}
              {deliveryStatus.charAt(0).toUpperCase() + deliveryStatus.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-80 bg-gradient-to-br from-blue-50 to-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
            {/* Map SVG */}
            <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
              {/* Background */}
              <rect width="400" height="300" fill="#f0f9ff" />

              {/* Grid */}
              <g stroke="#e2e8f0" strokeWidth="1" opacity="0.3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="300" />
                ))}
                {Array.from({ length: 4 }).map((_, i) => (
                  <line key={`h${i}`} x1="0" y1={i * 100} x2="400" y2={i * 100} />
                ))}
              </g>

              {/* Destination marker */}
              <g>
                <circle cx="350" cy="50" r="15" fill="#ef4444" opacity="0.2" />
                <circle cx="350" cy="50" r="10" fill="#ef4444" />
                <text x="350" y="55" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  D
                </text>
              </g>

              {/* Current location marker */}
              <g>
                <circle cx="100" cy="150" r="20" fill="#3b82f6" opacity="0.3" />
                <circle cx="100" cy="150" r="12" fill="#3b82f6" />
                <circle cx="100" cy="150" r="8" fill="white" />
              </g>

              {/* Route line */}
              <line
                x1="100"
                y1="150"
                x2="350"
                y2="50"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />

              {/* Start marker */}
              <g>
                <circle cx="50" cy="250" r="15" fill="#22c55e" opacity="0.2" />
                <circle cx="50" cy="250" r="10" fill="#22c55e" />
                <text x="50" y="255" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  S
                </text>
              </g>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-700">Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-700">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-700">Destination</span>
              </div>
            </div>
          </div>

          {/* Location Info */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-xs text-slate-600 mb-1">Current Location</p>
              <p className="text-sm font-mono text-blue-600">
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded border border-orange-200">
              <p className="text-xs text-slate-600 mb-1">ETA</p>
              <p className="text-sm font-semibold text-orange-600">
                {eta ? eta.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Calculating..."}
              </p>
            </div>
          </div>

          {/* Tracking Controls */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => setIsTracking(!isTracking)}
              className={`flex-1 ${isTracking ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"} text-white`}
            >
              {isTracking ? "Stop Tracking" : "Start Tracking"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-900">Delivery Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trackingHistory.map((event, index) => (
              <div key={index} className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full border-2 ${getStatusColor(event.status)}`} />
                  {index < trackingHistory.length - 1 && <div className="w-0.5 h-12 bg-slate-200 mt-2" />}
                </div>

                {/* Event details */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{event.message}</p>
                      <p className="text-xs text-slate-600 mt-1">{event.location}</p>
                    </div>
                    <Badge className={`border ${getStatusColor(event.status)} text-xs`}>{event.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {event.timestamp.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Update Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Live Updates</p>
              <p className="text-xs text-blue-800 mt-1">
                Location and status updates are refreshed every 3 seconds. Customer will receive notifications for
                status changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
