"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import Link from 'next/link';

interface TransferItem {
  id: number;
  productId: number;
  productName?: string;
  productSku?: string;
  quantity: number;
}

interface TransferDetail {
  id: number;
  transferNumber: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt?: string | null;
  items?: TransferItem[];
}

export default function TransferDetailPage() {
  const params = useParams() as { id?: string };
  const id = params?.id;
  const router = useRouter();
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : null;
        const res = await fetch(`/api/transfers/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          if (res.status === 404) {
            toast.error('Transfer not found');
            router.push('/transfers');
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `Failed to fetch transfer: ${res.status}`);
        }

        const data = await res.json();
        setTransfer(data);
      } catch (err) {
        console.error('Fetch transfer error:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to load transfer');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [id, router]);

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (!transfer) return (
    <div className="p-6">
      <p className="text-red-500">Transfer not found.</p>
      <Button asChild>
        <Link href="/transfers">Back</Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transfer {transfer.transferNumber}</h1>
          <p className="text-muted-foreground">From: {transfer.fromWarehouseId} → To: {transfer.toWarehouseId}</p>
          <p className="text-muted-foreground">Status: {transfer.status}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/transfers">Back</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Created: {new Date(transfer.createdAt).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Validated: {transfer.validatedAt ? new Date(transfer.validatedAt).toLocaleString() : '-'}</p>
            <p className="mt-2">Notes: {transfer.notes || '-'}</p>
          </div>

          <h3 className="text-lg font-medium mb-2">Items</h3>
          {transfer.items && transfer.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.productSku ?? `#${it.productId}`}</TableCell>
                    <TableCell>{it.productName ?? `#${it.productId}`}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No items found for this transfer.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
