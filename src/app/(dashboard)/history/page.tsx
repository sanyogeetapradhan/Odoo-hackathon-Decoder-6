"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { History, Search, Download, FilterX, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

interface LedgerEntry {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  warehouseId: number;
  warehouseName: string;
  operationType: string;
  referenceNumber: string;
  quantityChange: number;
  quantityAfter: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  notes: string | null;
}

type SortField = 'createdAt' | 'productName' | 'quantityChange' | 'quantityAfter';
type SortDirection = 'asc' | 'desc';

export default function StockHistoryPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: "",
    to: "",
  });
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch ledger data with pagination
  const fetchLedger = useCallback(async (isLoadMore = false) => {
    try {
      const token = localStorage.getItem("bearer_token");
      let apiUrl = `/api/stock-ledger?limit=50&page=${isLoadMore ? page : 1}`;
      
      if (filterType !== "all") apiUrl += `&operationType=${filterType}`;
      if (dateRange.from) apiUrl += `&startDate=${dateRange.from}`;
      if (dateRange.to) apiUrl += `&endDate=${dateRange.to}`;

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch stock history");
      const data = await response.json();
      
      if (isLoadMore) {
        setLedger(prev => [...prev, ...data]);
      } else {
        setLedger(data);
      }
      
      // Check if there's more data to load
      setHasMore(data.length === 50);
    } catch (error) {
      toast.error("Failed to load stock history");
    } finally {
      setIsLoading(false);
    }
  }, [filterType, dateRange, page]);

  // Initial data fetch
  useEffect(() => {
    fetchLedger();
  }, [filterType, dateRange]);

  // Handle load more
  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    fetchLedger(true);
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Export data to CSV
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      let apiUrl = `/api/stock-ledger?limit=1000`; // Get more data for export
      
      if (filterType !== "all") apiUrl += `&operationType=${filterType}`;
      if (dateRange.from) apiUrl += `&startDate=${dateRange.from}`;
      if (dateRange.to) apiUrl += `&endDate=${dateRange.to}`;

      const response = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch data for export");
      const data = await response.json();
      
      // Create CSV content
      const headers = [
        'Date', 'Operation', 'Reference', 'Product Name', 'SKU', 
        'Warehouse', 'Quantity Change', 'Quantity After', 'User', 'Notes'
      ];
      
      const csvContent = [
        headers.join(','),
        ...data.map((entry: LedgerEntry) => [
          new Date(entry.createdAt).toISOString(),
          entry.operationType,
          `"${entry.referenceNumber}"`,
          `"${entry.productName}"`,
          `"${entry.productSku}"`,
          `"${entry.warehouseName}"`,
          entry.quantityChange,
          entry.quantityAfter,
          `"${entry.createdByName}"`,
          `"${entry.notes || ''}"`
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', downloadUrl);
      link.setAttribute('download', `stock-movements-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Export completed successfully");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterType("all");
    setSearchTerm("");
    setDateRange({ from: "", to: "" });
  };

  // Get operation badge with enhanced styling
  const getOperationBadge = (type: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
      receipt: { variant: "default", label: "Receipt" },
      delivery: { variant: "secondary", label: "Delivery" },
      transfer_in: { variant: "outline", label: "Transfer In" },
      transfer_out: { variant: "outline", label: "Transfer Out" },
      adjustment: { variant: "destructive", label: "Adjustment" },
    };
    const { variant, label } = config[type] || { variant: "outline", label: type };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Filter and sort ledger data
  const filteredAndSortedLedger = useMemo(() => {
    let result = [...ledger];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.productName?.toLowerCase().includes(term) ||
          entry.productSku?.toLowerCase().includes(term) ||
          entry.referenceNumber.toLowerCase().includes(term) ||
          entry.warehouseName.toLowerCase().includes(term) ||
          entry.createdByName.toLowerCase().includes(term)
      );
    }
    
    // Apply date range filter
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      result = result.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate >= fromDate && entryDate <= toDate;
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Special handling for date field
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [ledger, searchTerm, dateRange, sortField, sortDirection]);

  // Check if any filters are active
  const hasActiveFilters = filterType !== "all" || searchTerm || dateRange.from || dateRange.to;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movement History</h1>
          <p className="text-muted-foreground">Complete audit trail of all inventory movements</p>
        </div>
        <Button 
          onClick={exportToCSV} 
          disabled={isExporting || isLoading || filteredAndSortedLedger.length === 0}
          variant="outline"
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filters</span>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="gap-1 h-8 text-xs"
              >
                <FilterX className="h-3.5 w-3.5" />
                Clear all
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by product, SKU, ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All operations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Operations</SelectItem>
                <SelectItem value="receipt">Receipts</SelectItem>
                <SelectItem value="delivery">Deliveries</SelectItem>
                <SelectItem value="transfer_in">Transfers In</SelectItem>
                <SelectItem value="transfer_out">Transfers Out</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                placeholder="From date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
              <Input
                type="date"
                placeholder="To date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filteredAndSortedLedger.length} records</span>
              {hasActiveFilters && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Filtered
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAndSortedLedger.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No movements found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Stock movements will appear here"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer whitespace-nowrap"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortField === 'createdAt' && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort('productName')}
                      >
                        <div className="flex items-center gap-1">
                          Product
                          {sortField === 'productName' && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead 
                        className="text-right cursor-pointer"
                        onClick={() => handleSort('quantityChange')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Change
                          {sortField === 'quantityChange' && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer"
                        onClick={() => handleSort('quantityAfter')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          After
                          {sortField === 'quantityAfter' && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedLedger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(entry.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{getOperationBadge(entry.operationType)}</TableCell>
                        <TableCell className="font-mono text-sm">{entry.referenceNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.productName}</p>
                            <p className="text-xs text-muted-foreground">{entry.productSku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{entry.warehouseName}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              entry.quantityChange > 0
                                ? "text-green-600 font-semibold"
                                : "text-red-600 font-semibold"
                            }
                          >
                            {entry.quantityChange > 0 ? "+" : ""}
                            {entry.quantityChange}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {entry.quantityAfter}
                        </TableCell>
                        <TableCell className="text-sm">{entry.createdByName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {hasMore && (
                <div className="flex justify-center p-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}