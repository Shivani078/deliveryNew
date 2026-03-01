// lib/useOrders.ts
import { useState, useEffect, useCallback } from 'react'

interface Order {
  id: string
  user_id: string
  status: string
  total: number
  created_at: string
  updated_at: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  order_number: string
  payment_method: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_city: string
  delivery_state: string
  delivery_zip_code: string
  customer_email: string
  payment_id: string
  payment_order_id: string
  payment_signature: string
  distance?: number
}

export default function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrders = useCallback(async () => {
    console.log('🔄 Fetching orders from /api/orders...')
    setLoading(true)
    setError(null)
    
    try {
      // GET /api/orders is the public endpoint that returns all orders sorted by
      // creation date.  There is no GET on /api/optimize-route so the previous
      // version returned a 404 HTML page which caused the error message in the
      // UI.
      const response = await fetch('/api/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`Failed to fetch orders: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('✅ Orders fetched:', data.length || 0, 'orders')
      console.log('📦 Sample order:', data[0])
      
      // Validate data structure
      if (!Array.isArray(data)) {
        console.warn('⚠️ Data is not an array:', data)
        setOrders([])
      } else {
        // Check for null delivery_zip_code
        const ordersWithNullZip = data.filter((o: Order) => !o.zip_code)
        if (ordersWithNullZip.length > 0) {
          console.warn(`⚠️ ${ordersWithNullZip.length} orders have null delivery_zip_code:`, ordersWithNullZip)
        }
        
        setOrders(data)
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
  }
}