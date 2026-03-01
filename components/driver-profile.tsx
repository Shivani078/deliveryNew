"use client"

import React, { useEffect, useState, useRef } from "react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, User, Camera } from "lucide-react"

interface Driver {
  id: string
  full_name?: string | null
  phone?: string | null
  city?: string | null
  street?: string | null
  state?: string | null
  pincode?: string | null
  created_at?: string | null
  avatar_url?: string | null
}

export default function DriverProfile() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [driver, setDriver] = useState<Partial<Driver> | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user
        if (!user) return
        const { data, error } = await supabase.from("drivers").select("*").eq("id", user.id).single()
        if (error && error.code !== "PGRST116") throw error
        if (mounted) {
          setDriver(data ?? { id: user.id })
          // try to get avatar public url
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(`avatars/${user.id}.png`)
          setAvatarUrl(urlData.publicUrl ?? null)
        }
      } catch (e) {
        console.error("[DriverProfile] load error:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [open])

  const onSave = async () => {
    if (!driver) return
    setSaving(true)
    try {
      const payload = {
        id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        street: driver.street,
        city: driver.city,
        state: driver.state,
        pincode: driver.pincode,
      }
      // upsert (insert or update)
      const { error } = await supabase.from('drivers').upsert(payload)
      if (error) throw error
      setOpen(false)
    } catch (e) {
      console.error('[DriverProfile] save error', e)
    } finally {
      setSaving(false)
    }
  }

  const onFile = async (file?: File) => {
    if (!file || !driver?.id) return
    setLoading(true)
    try {
      const path = `avatars/${driver.id}.png`
      await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (e) {
      console.error('[DriverProfile] upload error', e)
    } finally {
      setLoading(false)
    }
  }

  const initials = (name?: string | null) => (name ? name.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase() : 'DR')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:opacity-90">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <span className="font-semibold">{initials(driver?.full_name)}</span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Driver Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-400" />}
              </div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>onFile(e.target.files?.[0])} />
                  <Button variant="outline" size="sm" onClick={()=>fileRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />Upload Photo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={()=>{ setAvatarUrl(null); /* user can reupload */ }}>Remove</Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">ID: {driver?.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Input placeholder="Full name" value={driver?.full_name ?? ''} onChange={(e)=>setDriver(d=>({...d, full_name: e.target.value}))} />
              <Input placeholder="Phone" value={driver?.phone ?? ''} onChange={(e)=>setDriver(d=>({...d, phone: e.target.value}))} />
              <Input placeholder="Street" value={driver?.street ?? ''} onChange={(e)=>setDriver(d=>({...d, street: e.target.value}))} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="City" value={driver?.city ?? ''} onChange={(e)=>setDriver(d=>({...d, city: e.target.value}))} />
                <Input placeholder="State" value={driver?.state ?? ''} onChange={(e)=>setDriver(d=>({...d, state: e.target.value}))} />
                <Input placeholder="Pincode" value={driver?.pincode ?? ''} onChange={(e)=>setDriver(d=>({...d, pincode: e.target.value}))} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Close</Button>
              </DialogClose>
              <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
