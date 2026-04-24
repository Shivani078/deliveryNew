"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { MapPin, Phone, Mail, MapIcon, CheckCircle, User, Package, AlertCircle, Camera } from "lucide-react"

type DeliveryOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  special_instructions?: string;
  total: number;
  delivery_address: string;
  delivery_city: string;
  delivery_state?: string;
  delivery_zip_code: string;
  distance?: number;
  created_at: string;
  status: string;
};

type DeliveryDetailsModalProps = {
  order: DeliveryOrder;
  isOpen: boolean;
  onClose: () => void;
  onDeliveryComplete: (orderId: string, notes: string) => void;
};

export default function DeliveryDetailsModal({ order, isOpen, onClose, onDeliveryComplete }: DeliveryDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("customer")
  const [isDelivering, setIsDelivering] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [otp, setOtp] = useState("")
  const [showOtpInput, setShowOtpInput] = useState(false)

  const handleCompleteDelivery = () => {
    if (showOtpInput && !otp) {
      alert("Please enter OTP to confirm delivery")
      return
    }
    setIsDelivering(true)
    // Simulate delivery completion
    setTimeout(() => {
      onDeliveryComplete(order.id, deliveryNotes)
      setIsDelivering(false)
      setActiveTab("customer")
      setDeliveryNotes("")
      setOtp("")
      setShowOtpInput(false)
    }, 1000)
  }

  const getOrderAge = () => {
    const date = new Date(order.created_at)
    const now = new Date()
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    return `${hours} hours ago`
  }

  const getEstimatedDeliveryTime = () => {
    if (!order.distance) return "N/A"
    const estimatedMinutes = Math.ceil((order.distance / 30) * 60)
    const now = new Date()
    const deliveryTime = new Date(now.getTime() + estimatedMinutes * 60000)
    return deliveryTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between w-full">
            <div>
              <DialogTitle className="text-slate-900 text-xl">{order.order_number}</DialogTitle>
              <p className="text-sm text-slate-600 mt-1">Order placed {getOrderAge()}</p>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100">
            <TabsTrigger
              value="customer"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1 text-xs md:text-sm"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Customer</span>
            </TabsTrigger>
            <TabsTrigger
              value="location"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1 text-xs md:text-sm"
            >
              <MapIcon className="w-4 h-4" />
              <span className="hidden md:inline">Location</span>
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1 text-xs md:text-sm"
            >
              <Package className="w-4 h-4" />
              <span className="hidden md:inline">Items</span>
            </TabsTrigger>
            <TabsTrigger
              value="delivery"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-1 text-xs md:text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="hidden md:inline">Delivery</span>
            </TabsTrigger>
          </TabsList>

          {/* Customer Tab */}
          <TabsContent value="customer" className="space-y-4 mt-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Customer Name</p>
                  <p className="text-lg font-semibold text-slate-900">{order.customer_name}</p>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 mb-1">Phone</p>
                    <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline font-medium">
                      {order.customer_phone}
                    </a>
                  </div>
                  <Button size="sm" variant="outline" className="border-slate-300 bg-transparent">
                    Call
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 mb-1">Email</p>
                    <p className="text-slate-900">{order.customer_email || "N/A"}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 mb-2">Special Instructions</p>
                  <p className="text-sm text-slate-700">
                    {order.special_instructions || "No special instructions provided"}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-xs text-slate-600 mb-2">Order Amount</p>
                  <p className="text-2xl font-bold text-blue-600">₹{order.total}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Location Tab */}
          <TabsContent value="location" className="space-y-4 mt-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-600 mb-1">Delivery Address</p>
                    <p className="font-medium text-slate-900">{order.delivery_address}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {order.delivery_city}, {order.delivery_state || "Delhi"} {order.delivery_zip_code}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Distance</p>
                    <p className="text-lg font-bold text-orange-600">{order.distance} km</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <p className="text-xs text-slate-600 mb-1">Est. Delivery</p>
                    <p className="text-lg font-bold text-blue-600">{getEstimatedDeliveryTime()}</p>
                  </div>
                </div>

                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Open in Maps</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4 mt-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  {[
                    { name: "Product A", qty: 2, price: 150 },
                    { name: "Product B", qty: 1, price: 199 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white rounded border border-slate-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-sm text-slate-600">Qty: {item.qty}</p>
                      </div>
                      <p className="font-semibold text-slate-900">₹{item.price * item.qty}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium text-slate-900">₹{order.total - 50}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600">Delivery Fee:</span>
                    <span className="font-medium text-slate-900">₹50</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 flex justify-between">
                    <span className="font-semibold text-slate-900">Total:</span>
                    <span className="font-bold text-blue-600">₹{order.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4 mt-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="pt-6 space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Confirm Delivery:</strong> Please verify that you have delivered the order to the customer
                    before marking as complete.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">Delivery Notes</label>
                  <Textarea
                    placeholder="Add any delivery notes (e.g., left at door, handed to customer, etc.)"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="border-slate-300 min-h-24"
                  />
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                  <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-2">Upload delivery photo</p>
                  <Button variant="outline" size="sm" className="border-slate-300 bg-transparent">
                    Choose Photo
                  </Button>
                </div>

                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-900">OTP Verification</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowOtpInput(!showOtpInput)}
                      className="border-blue-300"
                    >
                      {showOtpInput ? "Cancel" : "Enable"}
                    </Button>
                  </div>
                  {showOtpInput && (
                    <Input
                      placeholder="Enter 4-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 4))}
                      maxLength={4}
                      className="border-slate-300"
                    />
                  )}
                </div>

                {/* Order Summary */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">Order Summary:</p>
                  <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Order Number:</span>
                      <span className="font-semibold text-slate-900">{order.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Customer:</span>
                      <span className="font-semibold text-slate-900">{order.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Amount:</span>
                      <span className="font-semibold text-blue-600">₹{order.total}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleCompleteDelivery}
                  disabled={isDelivering}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                >
                  {isDelivering ? "Completing..." : "Mark as Delivered"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
