"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, Navigation, AlertCircle, Search, Phone, MessageSquare } from "lucide-react"

type Order = {
  order_number: string;
  customer_name: string;
  status: string;
  total: number;
  items: number;
  created_at: Date;
  estimated_delivery: Date;
  current_location: string;
  delivery_partner: {
    name: string;
    phone: string;
    rating: number;
  };
  timeline: Array<{
    status: string;
    message: string;
    timestamp: Date | null;
    completed: boolean;
  }>;
};

export default function CustomerTracking() {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Mock orders database
  const mockOrders: Record<string, Order> = {
    "ORD-001": {
      order_number: "ORD-001",
      customer_name: "Rajesh Kumar",
      status: "in-progress",
      total: 499,
      items: 2,
      created_at: new Date(Date.now() - 30 * 60000),
      estimated_delivery: new Date(Date.now() + 25 * 60000),
      current_location: "Near Rajiv Chowk",
      delivery_partner: {
        name: "Vikram Singh",
        phone: "+91-9876543210",
        rating: 4.8,
      },
      timeline: [
        {
          status: "pending",
          message: "Order confirmed",
          timestamp: new Date(Date.now() - 30 * 60000),
          completed: true,
        },
        {
          status: "in-progress",
          message: "Order picked up from warehouse",
          timestamp: new Date(Date.now() - 20 * 60000),
          completed: true,
        },
        {
          status: "in-progress",
          message: "Out for delivery",
          timestamp: new Date(Date.now() - 10 * 60000),
          completed: true,
        },
        {
          status: "nearby",
          message: "Delivery partner is nearby",
          timestamp: new Date(Date.now() - 2 * 60000),
          completed: true,
        },
        {
          status: "delivered",
          message: "Delivered",
          timestamp: null,
          completed: false,
        },
      ],
    },
    "ORD-002": {
      order_number: "ORD-002",
      customer_name: "Priya Singh",
      status: "delivered",
      total: 799,
      items: 3,
      created_at: new Date(Date.now() - 120 * 60000),
      estimated_delivery: new Date(Date.now() - 30 * 60000),
      current_location: "Delivered",
      delivery_partner: {
        name: "Amit Kumar",
        phone: "+91-9876543211",
        rating: 4.9,
      },
      timeline: [
        {
          status: "pending",
          message: "Order confirmed",
          timestamp: new Date(Date.now() - 120 * 60000),
          completed: true,
        },
        {
          status: "in-progress",
          message: "Order picked up from warehouse",
          timestamp: new Date(Date.now() - 100 * 60000),
          completed: true,
        },
        {
          status: "in-progress",
          message: "Out for delivery",
          timestamp: new Date(Date.now() - 60 * 60000),
          completed: true,
        },
        {
          status: "delivered",
          message: "Delivered successfully",
          timestamp: new Date(Date.now() - 30 * 60000),
          completed: true,
        },
      ],
    },
  }

  const handleSearch = () => {
    if (!trackingNumber.trim()) return

    setIsSearching(true)
    setTimeout(() => {
      const order = mockOrders[trackingNumber.toUpperCase()]
      if (order) {
        setTrackedOrder(order)
      } else {
        setTrackedOrder(null)
        alert("Order not found. Please check the tracking number.")
      }
      setIsSearching(false)
    }, 500)
  }

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
        return <Clock className="w-5 h-5" />
      case "in-progress":
        return <Navigation className="w-5 h-5" />
      case "nearby":
        return <AlertCircle className="w-5 h-5" />
      case "delivered":
        return <CheckCircle2 className="w-5 h-5" />
      default:
        return null
    }
  }

  const formatTime = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Track Your Order</h1>
          <p className="text-slate-600">Enter your order number to track your delivery in real-time</p>
        </div>

        {/* Search Section */}
        <Card className="bg-white border-slate-200 mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Input
                placeholder="Enter order number (e.g., ORD-001)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="border-slate-300 flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                {isSearching ? "Searching..." : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-600 mt-3">Try: ORD-001 or ORD-002</p>
          </CardContent>
        </Card>

        {/* Order Details */}
        {trackedOrder && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-slate-900">{trackedOrder.order_number}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">Ordered on {formatDate(trackedOrder.created_at)}</p>
                  </div>
                  <Badge className={`border ${getStatusColor(trackedOrder.status)} flex items-center gap-1`}>
                    {getStatusIcon(trackedOrder.status)}
                    {trackedOrder.status.charAt(0).toUpperCase() + trackedOrder.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">Current Status</p>
                  <p className="text-lg font-semibold text-slate-900">{trackedOrder.current_location}</p>
                  {trackedOrder.status !== "delivered" && (
                    <p className="text-sm text-blue-600 mt-2">
                      Estimated delivery: {formatTime(trackedOrder.estimated_delivery)}
                    </p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                    <p className="text-xs text-slate-600 mb-1">Items</p>
                    <p className="text-xl font-bold text-slate-900">{trackedOrder.items}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                    <p className="text-xs text-slate-600 mb-1">Amount</p>
                    <p className="text-xl font-bold text-blue-600">₹{trackedOrder.total}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                    <p className="text-xs text-slate-600 mb-1">Status</p>
                    <p className="text-xl font-bold text-slate-900 capitalize">{trackedOrder.status}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Partner Info */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Delivery Partner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-semibold text-slate-900">{trackedOrder.delivery_partner.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm text-yellow-600">★</span>
                      <span className="text-sm text-slate-600">{trackedOrder.delivery_partner.rating} rating</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 flex items-center gap-1 bg-transparent"
                    >
                      <Phone className="w-4 h-4" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-300 flex items-center gap-1 bg-transparent"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-900">Delivery Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trackedOrder.timeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${
                            event.completed ? "bg-green-500 border-green-500" : "bg-white border-slate-300"
                          }`}
                        />
                        {index < trackedOrder.timeline.length - 1 && (
                          <div className={`w-0.5 h-12 ${event.completed ? "bg-green-500" : "bg-slate-200"} mt-2`} />
                        )}
                      </div>

                      {/* Event details */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`font-medium ${event.completed ? "text-slate-900" : "text-slate-600"}`}>
                              {event.message}
                            </p>
                            {event.timestamp && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(event.timestamp)} at {formatTime(event.timestamp)}
                              </p>
                            )}
                          </div>
                          {event.completed && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Need Help?</p>
                    <p className="text-xs text-blue-800 mt-1">
                      If you have any questions about your delivery, contact our support team or reach out to your
                      delivery partner directly.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Order Selected */}
        {!trackedOrder && trackingNumber && (
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Order not found. Please check the tracking number and try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!trackedOrder && !trackingNumber && (
          <Card className="bg-white border-slate-200">
            <CardContent className="pt-12 pb-12 text-center">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Enter your order number above to track your delivery</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
