"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
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
import { Plus, CheckCircle, Eye, Truck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Delivery {
  id: number;
  deliveryNumber: string;
  warehouseId: number;
  customerName: string;
  status: string;
  notes: string | null;
  createdAt: string;
  validatedAt: string | null;
}

export default function DeliveriesPage() {
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkAuthenticationAndFetch();
  }, []);

  const checkAuthenticationAndFetch = () => {
    const token = localStorage.getItem("bearer_token");
    if (!token) {
      const errorMessage = "You are not authenticated. Please log in.";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
      return;
    }
    fetchDeliveries();
  };

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem("bearer_token");
      
      const response = await fetch("/api/deliveries?limit=100", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const errorMessage = "Authentication failed. Please log in again.";
          setError(errorMessage);
          toast.error(errorMessage);
          localStorage.removeItem("bearer_token");
          return;
        }
        
        throw new Error(`Failed to fetch deliveries: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }
      
      setDeliveries(data);
    } catch (error) {
      console.error("Fetch deliveries error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      toast.error(`Failed to load deliveries: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    checkAuthenticationAndFetch();
  };

  const handleValidate = async (id: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      if (!token) {
        toast.error('You must be logged in to validate deliveries');
        return;
      }

      // Fetch delivery details to ensure items exist
      const detailRes = await fetch(`/api/deliveries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!detailRes.ok) {
        if (detailRes.status === 404) {
          toast.error('Delivery not found');
          fetchDeliveries();
          return;
        }
        const err = await detailRes.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to fetch delivery: ${detailRes.status}`);
      }

      const detail = await detailRes.json();
      if (!detail.items || detail.items.length === 0) {
        toast.error('No items found for this delivery. Please add items before validation.');
        // navigate to delivery detail where items can be inspected/added
        router.push(`/deliveries/${id}`);
        return;
      }

      if (!confirm("Validate this delivery? This will decrease stock levels.")) return;

      const response = await fetch(`/api/deliveries/${id}/validate`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to validate delivery");
      }

      toast.success("Delivery validated successfully");
      fetchDeliveries();
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to validate delivery");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      draft: "secondary",
      waiting: "outline",
      ready: "default",
      done: "default",
      cancelled: "destructive",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground">Manage outgoing stock to customers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/deliveries/new">
              <Plus className="mr-2 h-4 w-4" />
              New Delivery
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-20 ml-auto" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="text-red-500 mb-4">
                <Truck className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-semibold text-red-500">Error loading deliveries</h3>
              <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
              <div className="flex gap-2">
                <Button onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/deliveries/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Delivery
                  </Link>
                </Button>
              </div>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No deliveries found</h3>
              <p className="text-muted-foreground mb-4">Create your first delivery to track outgoing stock</p>
              <Button asChild>
                <Link href="/deliveries/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Delivery
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Delivery #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                    <TableCell>{delivery.customerName}</TableCell>
                    <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                    <TableCell>{new Date(delivery.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate" title={delivery.notes || ""}>
                      {delivery.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/deliveries/${delivery.id}`}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View details</span>
                          </Link>
                        </Button>
                        {delivery.status !== "done" && delivery.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleValidate(delivery.id)}
                            title="Validate delivery"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Validate</span>
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