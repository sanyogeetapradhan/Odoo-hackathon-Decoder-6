"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import Link from 'next/link';

interface DeliveryItem {
  id: number;
  productId: number;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice?: number;
}

interface DeliveryDetail {
  id: number;
  deliveryNumber: string;
  warehouseId: number;
  customerName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt?: string | null;
  items?: DeliveryItem[];
}

export default function DeliveryDetailPage() {
  const params = useParams() as { id?: string };
  const id = params?.id;
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
        const res = await fetch(`/api/deliveries/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Delivery not found');
            router.push('/deliveries');
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to fetch delivery: ${res.status}`);
        }

        const data = await res.json();
        setDelivery(data);
      } catch (err) {
        console.error('Fetch delivery error:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load delivery');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, router]);

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!delivery) return (
    <div className="p-6">
      <p className="text-red-500">Delivery not found.</p>
      <Button asChild>
        <Link href="/deliveries">Back</Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery {delivery.deliveryNumber}</h1>
          <p className="text-muted-foreground">Customer: {delivery.customerName}</p>
          <p className="text-muted-foreground">Status: {delivery.status}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/deliveries">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Created: {new Date(delivery.createdAt).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Validated: {delivery.validatedAt ? new Date(delivery.validatedAt).toLocaleString() : '-'}</p>
            <p className="mt-2">Notes: {delivery.notes || '-'}</p>
          </div>

          <h3 className="text-lg font-medium mb-2">Items</h3>
          {delivery.items && delivery.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.productSku ?? `#${it.productId}`}</TableCell>
                    <TableCell>{it.productName ?? `#${it.productId}`}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{it.unitPrice != null ? it.unitPrice : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No items found for this delivery.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
