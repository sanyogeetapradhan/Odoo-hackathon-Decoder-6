"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

interface ReceiptItem {
  id: number;
  receiptId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  productName: string;
  productSku: string;
}

interface ReceiptData {
  id: number;
  receiptNumber: string;
  warehouseId: number;
  supplierName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
  items: ReceiptItem[];
}

const ReceiptView = () => {
  const { receipt_id } = useParams();

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (receipt_id) {
      const fetchReceiptData = async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem("bearer_token");
          const response = await fetch(`/api/receipts/${receipt_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setReceiptData(data);
        } catch (error) {
          console.error('Error fetching receipt data:', error);
          setReceiptData(null);
        } finally {
          setLoading(false);
        }
      };

      fetchReceiptData();
    }
  }, [receipt_id]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      waiting: "outline",
      ready: "default",
      done: "default",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const calculateTotal = () => {
    if (!receiptData?.items) return 0;
    return receiptData.items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0);
  };

  if (!receipt_id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/receipts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Invalid Receipt ID</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/receipts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/receipts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Receipt Not Found</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Receipt not found</h3>
            <p className="text-muted-foreground">The receipt you're looking for doesn't exist or has been deleted.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/receipts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipt {receiptData.receiptNumber}</h1>
          <p className="text-muted-foreground">View receipt details and items</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Receipt Number</label>
                <p className="text-sm font-medium">{receiptData.receiptNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(receiptData.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                <p className="text-sm font-medium">{receiptData.supplierName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                <p className="text-sm font-medium">{new Date(receiptData.createdAt).toLocaleDateString()}</p>
              </div>
              {receiptData.validatedAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Validated Date</label>
                  <p className="text-sm font-medium">{new Date(receiptData.validatedAt).toLocaleDateString()}</p>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Notes</label>
                <p className="text-sm">{receiptData.notes || "No notes"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Items</span>
              <span className="text-sm">{receiptData.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Total Quantity</span>
              <span className="text-sm">{receiptData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Value</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Items</CardTitle>
        </CardHeader>
        <CardContent>
          {receiptData.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items in this receipt
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptData.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.productSku}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${(item.quantity * item.unitPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptView;