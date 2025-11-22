"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface ReceiptItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<{ id: number; name: string; sku: string }[]>([]);
  
  const [formData, setFormData] = useState({
    supplierName: "",
    warehouseId: "",
    notes: "",
  });
  
  // Add receipt number state
  const [receiptNumber, setReceiptNumber] = useState("");

  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([
    { productId: 0, productName: "", quantity: 1, unitPrice: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        
        // Fetch suppliers
        const suppliersResponse = await fetch("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData);
        }
        
        // Fetch warehouses
        const warehousesResponse = await fetch("/api/warehouses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (warehousesResponse.ok) {
          const warehousesData = await warehousesResponse.json();
          setWarehouses(warehousesData);
        }
        
        // Fetch products
        const productsResponse = await fetch("/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData);
        }
      } catch (error) {
        toast.error("Failed to load data");
      }
    };
    
    fetchData();
  }, []);

  // Generate a human-readable unique receipt number on mount
  useEffect(() => {
    const generateReceiptNumber = () => {
      const now = new Date();
      const date = now.toISOString().slice(0,10).replace(/-/g,""); // YYYYMMDD
      const time = now.toTimeString().slice(0,8).replace(/:/g,""); // HHMMSS
      const rand = Math.floor(Math.random() * 9000) + 1000; // 4 digit random
      return `RCPT-${date}-${time}-${rand}`;
    };
    setReceiptNumber(generateReceiptNumber());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const updatedItems = [...receiptItems];
    if (field === "productId") {
      const product = products.find(p => p.id === Number(value));
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: Number(value),
        productName: product ? product.name : ""
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value
      };
    }
    setReceiptItems(updatedItems);
  };

  const addItem = () => {
    setReceiptItems([...receiptItems, { productId: 0, productName: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (receiptItems.length > 1) {
      setReceiptItems(receiptItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("bearer_token");
      
      // supplier name comes directly from the text input
      const supplierName = formData.supplierName;

      // try to get current user id for created_by (optional)
      const createdBy = localStorage.getItem("user_id") || localStorage.getItem("user") || undefined;

      const receiptData = {
        // DB column names (snake_case) to match your receipts table
        receipt_number: receiptNumber,
        warehouse_id: formData.warehouseId ? Number(formData.warehouseId) : null,
        supplier_name: supplierName,
        status: "draft",
        notes: formData.notes,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        // keep items for backend to persist in related table
        items: receiptItems.filter(item => item.productId > 0 && item.quantity > 0)
      };

      const response = await fetch("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(receiptData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create receipt");
      }

      toast.success("Receipt created successfully");
      router.push("/receipts");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/receipts">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Receipts
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Receipt</h1>
        <p className="text-muted-foreground">Create a new receipt for incoming stock</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Receipt Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Insert read-only Receipt Number field */}
            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Receipt Number</Label>
              <Input id="receiptNumber" name="receiptNumber" value={receiptNumber} readOnly />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier</Label>
                <Input
                  id="supplierName"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleInputChange}
                  placeholder="Enter supplier name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="warehouseId">Warehouse</Label>
                <Select value={formData.warehouseId} onValueChange={(value) => handleSelectChange("warehouseId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Optional notes about this receipt"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Receipt Items
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receiptItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor={`product-${index}`}>Product</Label>
                    <Select
                      value={item.productId.toString()}
                      onValueChange={(value) => handleItemChange(index, "productId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`unitPrice-${index}`}>Unit Price</Label>
                    <Input
                      id={`unitPrice-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    disabled={receiptItems.length === 1}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Receipt"}
          </Button>
        </div>
      </form>
    </div>
  );
}