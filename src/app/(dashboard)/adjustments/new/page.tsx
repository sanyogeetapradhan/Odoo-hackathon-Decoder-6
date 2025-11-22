"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function NewAdjustmentPage() {
  const router = useRouter();
  const [adjustmentNumber, setAdjustmentNumber] = useState("");
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  // selected product id (string), "new" indicates creating a new product
  const [productId, setProductId] = useState<string>("");
  // searchable query for product search
  const [productQuery, setProductQuery] = useState<string>("");
  // optional new product name when user chooses to create one
  const [newProductName, setNewProductName] = useState<string>("");
  // separate increase/reduce quantities
  const [increaseBy, setIncreaseBy] = useState<number>(0);
  const [decreaseBy, setDecreaseBy] = useState<number>(0);
  const [products, setProducts] = useState<Array<{ id: number; name: string; sku?: string }>>([]);
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
          if (data.length > 0) setWarehouseId(String(data[0].id));
        }
      })
      .catch(() => {
        // ignore
      });

    // fetch next adjustment number
    fetch('/api/adjustments/next-number')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (data && data.next) setAdjustmentNumber(data.next);
      })
      .catch(() => {
        const fallback = `ADJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
        setAdjustmentNumber(fallback);
      });

    // fetch products for dropdown
    fetch('/api/products?limit=100', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })));
          setProductId(String(data[0].id));
        }
      })
      .catch(() => {
        // ignore product loading errors — dropdown will be empty
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('bearer_token');
      if (!token) {
        toast.error('You must be logged in to create an adjustment');
        return;
      }

      // validate required fields
      if (!adjustmentNumber || !warehouseId || !productId) {
        toast.error('Please fill required fields');
        return;
      }
      if (increaseBy <= 0 && decreaseBy <= 0) {
        toast.error('Provide an increase or decrease quantity');
        return;
      }

      const body: any = {
        adjustmentNumber: adjustmentNumber.trim(),
        warehouseId: parseInt(warehouseId),
        productId: productId === "new" ? null : parseInt(productId),
        increase_by: Number(increaseBy),
        decrease_by: Number(decreaseBy),
        notes: notes.trim() || null,
      };
      if (productId === "new") {
        body.new_product_name = newProductName.trim() || productQuery.trim();
      }

      const res = await fetch('/api/adjustments', {
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

      toast.success('Adjustment created');
      router.push('/adjustments');
    } catch (err) {
      console.error('Create adjustment error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Create New Adjustment</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Adjustment Number</label>
          {/* read-only adjustment number */}
          <Input value={adjustmentNumber} readOnly />
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Product</label>
          <div className="relative">
            <input
              type="text"
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                // clear "new product" name if typing
                if (productId === "new") setNewProductName("");
              }}
              placeholder="Search product by name or SKU"
              className="w-full rounded-md border px-3 py-2 text-sm"
              onFocus={() => { /* show suggestions */ }}
            />
            {/* suggestions dropdown */}
            {productQuery.trim().length > 0 && (
              <ul className="absolute z-20 bg-white border rounded mt-1 w-full max-h-48 overflow-auto text-sm">
                {products
                  .filter(p =>
                    p.name.toLowerCase().includes(productQuery.toLowerCase()) ||
                    (p.sku && p.sku.toLowerCase().includes(productQuery.toLowerCase()))
                  )
                  .slice(0, 50)
                  .map(p => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setProductId(String(p.id));
                        setProductQuery(`${p.name}${p.sku ? ` (${p.sku})` : ""}`);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {p.name}{p.sku ? ` (${p.sku})` : ""}
                    </li>
                  ))
                }
                <li
                  onClick={() => {
                    setProductId("new");
                    setNewProductName(productQuery);
                    setProductQuery(productQuery);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-t"
                >
                  + Add new product "{productQuery}"
                </li>
              </ul>
            )}
            {/* show selected product summary if selected from list */}
            {productId && productId !== "new" && !productQuery && (
              <div className="mt-1 text-sm text-muted-foreground">
                Selected product ID: {productId}
              </div>
            )}
            {productId === "new" && (
              <div className="mt-2">
                <label className="block text-xs font-medium mb-1">New product name</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Increase / Reduce Quantity</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Increase By</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIncreaseBy((v) => Math.max(0, v - 1))}
                  className="px-3 py-1 rounded border bg-white"
                >
                  −
                </button>
                <Input
                  value={String(increaseBy)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "0", 10);
                    setIncreaseBy(Number.isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  className="w-28 text-center"
                />
                <button
                  type="button"
                  onClick={() => setIncreaseBy((v) => v + 1)}
                  className="px-3 py-1 rounded border bg-white"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Decrease By</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDecreaseBy((v) => Math.max(0, v - 1))}
                  className="px-3 py-1 rounded border bg-white"
                >
                  −
                </button>
                <Input
                  value={String(decreaseBy)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || "0", 10);
                    setDecreaseBy(Number.isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  className="w-28 text-center"
                />
                <button
                  type="button"
                  onClick={() => setDecreaseBy((v) => v + 1)}
                  className="px-3 py-1 rounded border bg-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Adjustment'}</Button>
          <Button variant="outline" onClick={() => router.push('/adjustments')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
