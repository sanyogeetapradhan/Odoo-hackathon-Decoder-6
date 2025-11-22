"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewTransferPage() {
  const router = useRouter();
  const [transferNumber, setTransferNumber] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState<string | undefined>(undefined);
  const [toWarehouseId, setToWarehouseId] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;

    fetch('/api/warehouses?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (Array.isArray(data)) {
          setWarehouses(data.map((w: any) => ({ id: w.id, name: w.name })));
          if (data.length > 0) {
            setFromWarehouseId(String(data[0].id));
            setToWarehouseId(String(data.length > 1 ? data[1].id : data[0].id));
          }
        }
      })
      .catch(() => {
        // ignore
      });

    fetch('/api/transfers/next-number')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (data && data.next) setTransferNumber(data.next);
      })
      .catch(() => {
        const fallback = `TRF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        setTransferNumber(fallback);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        toast.error('You must be logged in to create a transfer');
        return;
      }

      if (!transferNumber || !fromWarehouseId || !toWarehouseId) {
        toast.error('Please fill transfer number and both warehouses');
        return;
      }

      if (fromWarehouseId === toWarehouseId) {
        toast.error('From and To warehouses must be different');
        return;
      }

      const body = {
        transferNumber: transferNumber.trim(),
        fromWarehouseId: parseInt(fromWarehouseId),
        toWarehouseId: parseInt(toWarehouseId),
        notes: notes.trim() || null,
      };

      const res = await fetch('/api/transfers', {
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

      toast.success('Transfer created');
      router.push('/transfers');
    } catch (err) {
      console.error('Create transfer error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Transfer</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Transfer Number</label>
          <Input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From Warehouse</label>
            <select
              value={fromWarehouseId}
              onChange={(e) => setFromWarehouseId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Warehouse</label>
            <select
              value={toWarehouseId}
              onChange={(e) => setToWarehouseId(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Transfer'}</Button>
          <Button variant="outline" onClick={() => router.push('/transfers')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
