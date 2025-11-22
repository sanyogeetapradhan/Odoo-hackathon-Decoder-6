"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';

interface ProductInfo {
  id: number;
  name: string;
  sku: string;
  unitOfMeasure?: string;
}

interface WarehouseInfo {
  id: number;
  name: string;
  location?: string;
}

interface AdjustmentDetail {
  id: number;
  adjustmentNumber: string;
  warehouseId: number;
  productId: number;
  countedQuantity: number;
  systemQuantity: number;
  difference: number;
  reason: string | null;
  status: string;
  createdAt: string;
  validatedAt: string | null;
  product?: ProductInfo;
  warehouse?: WarehouseInfo;
}

export default function AdjustmentDetailPage() {
  const params = useParams() as { id?: string };
  const id = params?.id;
  const router = useRouter();
  const [adjustment, setAdjustment] = useState<AdjustmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
        const res = await fetch(`/api/adjustments/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Adjustment not found');
            router.push('/adjustments');
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to fetch adjustment: ${res.status}`);
        }

        const data = await res.json();
        setAdjustment(data);
      } catch (err) {
        console.error('Fetch adjustment error:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load adjustment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, router]);

  if (isLoading) {
    return <div className="p-6">Loading…</div>;
  }

  if (!adjustment) {
    return (
      <div className="p-6">
        <p className="text-red-500">Adjustment not found.</p>
        <Button asChild>
          <Link href="/adjustments">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Adjustment {adjustment.adjustmentNumber}</h1>
          <p className="text-muted-foreground">Status: {adjustment.status}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/adjustments">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Product</h3>
              <p className="font-medium">{adjustment.product?.name ?? `#${adjustment.productId}`}</p>
              <p className="text-sm text-muted-foreground">SKU: {adjustment.product?.sku ?? '-'}</p>
              <p className="text-sm text-muted-foreground">UoM: {adjustment.product?.unitOfMeasure ?? '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Warehouse</h3>
              <p className="font-medium">{adjustment.warehouse?.name ?? `#${adjustment.warehouseId}`}</p>
              <p className="text-sm text-muted-foreground">Location: {adjustment.warehouse?.location ?? '-'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Quantities</h3>
              <p>System: {adjustment.systemQuantity}</p>
              <p>Counted: {adjustment.countedQuantity}</p>
              <p>Difference: <span className={adjustment.difference > 0 ? 'text-green-600' : adjustment.difference < 0 ? 'text-red-600' : ''}>{adjustment.difference > 0 ? '+' : ''}{adjustment.difference}</span></p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Meta</h3>
              <p>Created at: {new Date(adjustment.createdAt).toLocaleString()}</p>
              <p>Validated at: {adjustment.validatedAt ? new Date(adjustment.validatedAt).toLocaleString() : '-'}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Notes / Reason</h3>
            <p className="whitespace-pre-wrap">{adjustment.reason || '-'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
