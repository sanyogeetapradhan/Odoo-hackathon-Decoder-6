"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Use native select for simplicity — the Radix-based Select component
// in this codebase expects a different structure. A native <select>
// works reliably for a simple warehouse dropdown.
import { toast } from "sonner";

export default function NewDeliveryPage() {
  const router = useRouter();
  const [deliveryNumber, setDeliveryNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    // Try to fetch available warehouses to populate select
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
    fetch('/api/warehouses?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (Array.isArray(data)) {
          setWarehouses(data.map((w: any) => ({ id: w.id, name: w.name })));
          if (data.length > 0) setWarehouseId(String(data[0].id));
        }
      })
      .catch(() => {
        // ignore — user can still enter a warehouse id manually
      });
    // Fetch automatically generated delivery number from server
    fetch('/api/deliveries/next-number')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (data && data.next) setDeliveryNumber(data.next);
      })
      .catch(() => {
        // If server endpoint not available, fallback to timestamp-based number
        const fallback = `DEL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        setDeliveryNumber(fallback);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('bearer_token');

      if (!token) {
        toast.error('You must be logged in to create a delivery');
        return;
      }

      if (!deliveryNumber || !warehouseId || !customerName) {
        toast.error('Please fill delivery number, warehouse and customer name');
        return;
      }

      const body = {
        deliveryNumber: deliveryNumber.trim(),
        warehouseId: parseInt(warehouseId),
        customerName: customerName.trim(),
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Create failed: ${res.status}`);
      }

      toast.success('Delivery created');
      router.push('/deliveries');
    } catch (err) {
      console.error('Create delivery error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Delivery</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Delivery Number</label>
          <Input value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value)} placeholder="e.g. DEL-0001" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Warehouse</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">If warehouses do not appear, ensure you have permission or refresh.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Delivery'}</Button>
          <Button variant="outline" onClick={() => router.push('/deliveries')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
