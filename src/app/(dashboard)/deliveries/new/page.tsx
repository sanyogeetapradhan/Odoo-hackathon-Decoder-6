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
  const [items, setItems] = useState<Array<{
    sku: string;
    quantity: string;
    unitPrice?: string;
    productId?: number | null;
    availableQty?: number | null;
    error?: string | null;
    totalQty?: number | null;
  }>>([
    { sku: '', quantity: '1', unitPrice: '', productId: null, availableQty: null, error: null, totalQty: null },
  ]);
  const [suggestions, setSuggestions] = useState<Array<Array<any>>>([]);

  useEffect(() => {
    // Try to fetch available warehouses to populate select
    const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
    fetch('/api/warehouses?limit=1000', {
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

  // keep suggestions array in sync with items length
  useEffect(() => {
    setSuggestions((s) => {
      const copy = [...s];
      while (copy.length < items.length) copy.push([]);
      while (copy.length > items.length) copy.pop();
      return copy;
    });
  }, [items.length]);

  // when warehouse changes, refresh availableQty for items that have productId
  useEffect(() => {
    const refresh = async () => {
      if (!warehouseId) return;
      const wid = parseInt(warehouseId);
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.productId) continue;
        try {
          const token = localStorage.getItem('bearer_token');
          const stockRes = await fetch(`/api/products/${it.productId}/stock`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (!stockRes.ok) continue;
          const stockData = await stockRes.json();
          const match = Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === wid) : null;
          const available = match ? Number(match.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
          updateItem(i, { availableQty: available });
        } catch (err) {
          // ignore
        }
      }
    };
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

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

      if (!items || items.length === 0) {
        toast.error('Please add at least one item to the delivery');
        return;
      }

      // Resolve SKUs to product IDs for items
      const resolvedItems: Array<{ productId: number; quantity: number; unitPrice?: number }> = [];
      for (const it of items) {
        if (!it.sku || !it.quantity) {
          toast.error('Each item needs SKU and quantity');
          return;
        }

        if (it.error) {
          toast.error(`Fix item errors before submitting: ${it.error}`);
          return;
        }

        // If productId was already resolved by the UI, use it — otherwise lookup
        let match: any = null;
        if (it.productId) {
          match = { id: it.productId, sku: it.sku };
        } else {
          const prodRes = await fetch(`/api/products?search=${encodeURIComponent(it.sku)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });

          if (!prodRes.ok) {
            toast.error('Failed to lookup product SKU');
            return;
          }

          const prodData = await prodRes.json();
          match = Array.isArray(prodData)
            ? prodData.find((p: any) => String(p.sku).toLowerCase() === it.sku.trim().toLowerCase())
            : null;

          if (!match) {
            toast.error(`Product with SKU "${it.sku}" not found`);
            return;
          }
        }

        const qty = parseInt(it.quantity);
        if (isNaN(qty) || qty <= 0) {
          toast.error('Quantity must be a positive number');
          return;
        }

        resolvedItems.push({
          productId: parseInt(match.id),
          quantity: qty,
          unitPrice: it.unitPrice ? Number(it.unitPrice) : undefined,
        });
      }

      const body = {
        deliveryNumber: deliveryNumber.trim(),
        warehouseId: parseInt(warehouseId),
        customerName: customerName.trim(),
        notes: notes.trim() || null,
        items: resolvedItems,
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

  const addItem = () => {
    setItems((s) => [...s, { sku: '', quantity: '1', unitPrice: '', productId: null, availableQty: null, error: null }]);
    setSuggestions((s) => [...s, []]);
  };

  const removeItem = (idx: number) => {
    setItems((s) => s.filter((_, i) => i !== idx));
    setSuggestions((s) => s.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, patch: Partial<{ sku: string; quantity: string; unitPrice?: string; productId?: number | null; availableQty?: number | null; error?: string | null; totalQty?: number | null }>) =>
    setItems((s) => s.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  // Fetch product suggestions for a given item index
  const fetchSuggestions = async (query: string, idx: number) => {
    if (!query || query.trim().length === 0) {
      setSuggestions((s) => s.map((arr, i) => (i === idx ? [] : arr)));
      return;
    }
    try {
      const token = localStorage.getItem('bearer_token');
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions((s) => {
        const copy = [...s];
        copy[idx] = Array.isArray(data) ? data : [];
        return copy;
      });
      // If there's an exact SKU match in results, auto-select it so unit price and available qty appear
      if (Array.isArray(data)) {
        const exact = data.find((p: any) => String(p.sku).toLowerCase() === query.trim().toLowerCase());
        if (exact) {
          // small delay to allow suggestions state update/render
          setTimeout(() => onSelectSuggestion(idx, exact), 50);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  const onSelectSuggestion = async (idx: number, prod: any) => {
    // prod should have id, sku, sellingPrice
    updateItem(idx, { sku: prod.sku, productId: parseInt(prod.id), unitPrice: String(prod.sellingPrice) });
    // fetch stock for this product to find quantity for selected warehouse
    try {
      const token = localStorage.getItem('bearer_token');
      const stockRes = await fetch(`/api/products/${prod.id}/stock`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!stockRes.ok) {
        updateItem(idx, { availableQty: null });
        console.debug('stock fetch failed', prod.id, stockRes.status);
        return;
      }
      const stockData = await stockRes.json();
      console.debug('stockData for product', prod.id, stockData);
      // also fetch product details to get total/currentStock
      try {
        const prodRes = await fetch(`/api/products/${prod.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (prodRes.ok) {
          const prodDetails = await prodRes.json();
          updateItem(idx, { /* keep existing fields */ });
          // store total as availableQty when no per-warehouse info; we add a new field `totalQty`
          updateItem(idx, { availableQty: null });
          // attach totalQty as a non-persisted display field
          updateItem(idx, { totalQty: prodDetails.currentStock });
        }
      } catch (err) {
        // ignore
      }
      // find the record for selected warehouse
      const wid = warehouseId ? parseInt(warehouseId) : null;
      const match = wid ? (Array.isArray(stockData) ? stockData.find((r: any) => r.warehouseId === wid) : null) : null;
      const available = match ? Number(match.quantity) : (Array.isArray(stockData) && stockData.length > 0 ? Number(stockData[0].quantity) : null);
      updateItem(idx, { availableQty: available });
    } catch (err) {
      updateItem(idx, { availableQty: null });
    }
    // clear suggestions for this idx
    setSuggestions((s) => s.map((arr, i) => (i === idx ? [] : arr)));
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Delivery</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Delivery Number</label>
          <Input 
            value={deliveryNumber} 
            readOnly
            className="bg-muted cursor-not-allowed"
            placeholder="e.g. DEL-0001" 
          />
          <p className="text-xs text-muted-foreground mt-1">Auto-generated delivery number.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Warehouse <span className="text-destructive">*</span></label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            required
          >
            <option value="">Select a warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">Warehouse is required. If none appear, ensure you have permission or refresh.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Customer Name <span className="text-destructive">*</span></label>
          <Input 
            value={customerName} 
            onChange={(e) => setCustomerName(e.target.value)} 
            placeholder="Customer name" 
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div>
          <h3 className="text-sm font-medium">Items <span className="text-destructive">*</span></h3>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2 items-start relative">
                <div className="flex-1">
                  <Input
                    placeholder="Product SKU or name"
                    value={it.sku}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(idx, { sku: v, productId: null, unitPrice: '', availableQty: null });
                      fetchSuggestions(v, idx);
                    }}
                  />
                  {suggestions[idx] && suggestions[idx].length > 0 && (
                    <div className="absolute z-10 bg-white border rounded-md mt-1 w-full shadow max-h-48 overflow-auto">
                      {suggestions[idx].map((p: any) => (
                        <div
                          key={p.id}
                          className="px-2 py-1 hover:bg-slate-100 cursor-pointer text-sm"
                          onClick={() => onSelectSuggestion(idx, p)}
                        >
                          <div className="font-medium">{p.sku} — {p.name}</div>
                          <div className="text-xs text-muted-foreground">Price: {p.sellingPrice ?? '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-24">
                  <Input
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateItem(idx, { quantity: v });
                      const parsed = parseInt(v);
                      if (!isNaN(parsed) && it.availableQty != null) {
                        if (parsed > it.availableQty) {
                          updateItem(idx, { error: `Requested qty (${parsed}) exceeds available (${it.availableQty})` });
                        } else {
                          updateItem(idx, { error: null });
                        }
                      } else {
                        updateItem(idx, { error: null });
                      }
                    }}
                    className="w-24"
                  />
                  {it.error && <div className="text-xs text-destructive mt-1">{it.error}</div>}
                </div>
                <div className="w-32">
                  <div className="text-sm">Price: <span className="font-medium">{it.unitPrice != null && it.unitPrice !== '' ? it.unitPrice : '—'}</span></div>
                </div>
                <div className="w-32">
                  <div className="text-sm">In Stock: <span className="font-medium">{it.availableQty != null ? String(it.availableQty) : '—'}</span></div>
                </div>
                <div className="w-36">
                  <div className="text-sm">Line total: <span className="font-medium">{(Number(it.unitPrice || 0) * Number(it.quantity || 0)).toFixed(2)}</span></div>
                </div>
                <Button variant="ghost" onClick={() => removeItem(idx)}>Remove</Button>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Button variant="outline" onClick={addItem}>Add Item</Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || items.some((it) => !!it.error)}
          >
            {isSubmitting ? 'Creating…' : 'Create Delivery'}
          </Button>
          <Button variant="outline" onClick={() => router.push('/deliveries')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
