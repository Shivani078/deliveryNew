"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Navigation, Zap } from "lucide-react"

export default function OrderCard({ order, priority, onSelect, onNavigate }: { order: any; priority: any; onSelect: any; onNavigate?: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "delivered":
        return "bg-green-100 text-green-800 border-green-300"
      default:
        return "bg-slate-100 text-slate-800 border-slate-300"
    }
  }

  const calculateEstimatedTime = (distance: number) => {
    // Assuming average speed of 30 km/h in city traffic
    const estimatedMinutes = Math.ceil((distance / 30) * 60)
    if (estimatedMinutes < 1) return "< 1 min"
    if (estimatedMinutes < 60) return `${estimatedMinutes} min`
    const hours = Math.floor(estimatedMinutes / 60)
    const mins = estimatedMinutes % 60
    return `${hours}h ${mins}m`
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  const isUrgent = () => {
  if (!order?.created_at) return false

  const date = new Date(order.created_at).getTime()
  if (isNaN(date)) return false

  const now = Date.now()
  const minutes = (now - date) / 60000

  return minutes > 30
}

  return (
    <Card
      className={`bg-white border-slate-200 hover:shadow-lg transition-shadow cursor-pointer ${isUrgent() ? "border-l-4 border-l-red-500" : ""}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Priority Badge and Status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 text-white">Priority #{priority}</Badge>
              {isUrgent() && (
                <Badge className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Urgent
                </Badge>
              )}
            </div>
            <Badge className={`border ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>

          {/* Order Number */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Order Number</p>
            <p className="font-semibold text-slate-900">{order.order_number}</p>
          </div>

          {/* Customer Name */}
          <div>
            <p className="text-xs text-slate-500 mb-1">Customer</p>
            <p className="font-medium text-slate-900">{order.customer_name}</p>
          </div>

          {/* Address */}
          <div className="flex gap-2">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 line-clamp-2">{order.delivery_address}</p>
          </div>

          {/* Distance and Estimated Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
              <Navigation className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500">Distance</p>
                <p className="font-semibold text-slate-900">{order.distance} km</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Est. Time</p>
                <p className="font-semibold text-slate-900 text-xs">{calculateEstimatedTime(order.distance)}</p>
              </div>
            </div>
          </div>

          {/* Order Time */}
          <div className="text-xs text-slate-500">Order placed: {timeAgo(order.created_at)}</div>

          {/* Amount */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-xs text-slate-600 mb-1">Order Amount</p>
            <p className="text-lg font-bold text-blue-600">₹{order.total}</p>
          </div>

          {/* Action Button */}
          <div className="flex gap-2">
            <Button onClick={onSelect} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white">
              Start Delivery
            </Button>
            <Button onClick={onNavigate} variant="outline" className="w-28">
              Navigate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
