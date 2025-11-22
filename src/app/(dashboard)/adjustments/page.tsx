"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckCircle, Eye, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Adjustment {
  id: number;
  adjustmentNumber: string;
  warehouseId: number;
  productId: number;
  productSku?: string;
  countedQuantity: number;
  systemQuantity: number;
  difference: number;
  reason: string | null;
  status: string;
  createdAt: string;
  validatedAt: string | null;
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const fetchAdjustments = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/adjustments?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch adjustments");
      const data = await response.json();
      setAdjustments(data);
    } catch (error) {
      toast.error("Failed to load adjustments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (id: number) => {
    if (!confirm("Validate this adjustment? This will correct stock levels.")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/adjustments/${id}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to validate adjustment");
      }

      toast.success("Adjustment validated successfully");
      fetchAdjustments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to validate adjustment");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "secondary",
      done: "default",
      cancelled: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Adjustments</h1>
          <p className="text-muted-foreground">Correct stock discrepancies and manage inventory counts</p>
        </div>
        <Button asChild>
          <Link href="/adjustments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Adjustment
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : adjustments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No adjustments found</h3>
              <p className="text-muted-foreground">Create an adjustment to correct stock discrepancies</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adjustment #</TableHead>
                  <TableHead>Product SKU</TableHead>
                  <TableHead>System Qty</TableHead>
                  <TableHead>Counted Qty</TableHead>
                  <TableHead>Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adjustment) => (
                  <TableRow key={adjustment.id}>
                    <TableCell className="font-medium">{adjustment.adjustmentNumber}</TableCell>
                    <TableCell>{adjustment.productSku ?? `#${adjustment.productId}`}</TableCell>
                    <TableCell>{adjustment.systemQuantity}</TableCell>
                    <TableCell>{adjustment.countedQuantity}</TableCell>
                    <TableCell>
                      <span className={adjustment.difference > 0 ? "text-green-600" : adjustment.difference < 0 ? "text-red-600" : ""}>
                        {adjustment.difference > 0 ? "+" : ""}{adjustment.difference}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                    <TableCell>{new Date(adjustment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/adjustments/${adjustment.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {adjustment.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(adjustment.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
