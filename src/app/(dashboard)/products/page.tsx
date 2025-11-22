"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, Loader2, Grid, List, Eye, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId: number | null;
  unitOfMeasure: string;
  reorderLevel: number;
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  description: string | null;
  isActive: boolean;
  image?: string;
}

interface Category {
  id: number;
  name: string;
}

// AddProductModal Component
function AddProductModal({ 
  onClose, 
  editingProduct, 
  categories, 
  onSave 
}: { 
  onClose: () => void;
  editingProduct: Product | null;
  categories: Category[];
  onSave: (product: Partial<Product>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    sku: editingProduct?.sku || '',
    name: editingProduct?.name || '',
    categoryId: editingProduct?.categoryId?.toString() || 'none',
    unitOfMeasure: editingProduct?.unitOfMeasure || '',
    currentStock: editingProduct?.currentStock?.toString() || '0',
    reorderLevel: editingProduct?.reorderLevel?.toString() || '0',
    costPrice: editingProduct?.costPrice?.toString() || '0',
    sellingPrice: editingProduct?.sellingPrice?.toString() || '0',
    description: editingProduct?.description || '',
    isActive: editingProduct?.isActive !== undefined ? editingProduct.isActive : true,
    image: editingProduct?.image || '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(editingProduct?.image || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave({
        ...formData,
        categoryId: formData.categoryId === 'none' ? null : parseInt(formData.categoryId),
        currentStock: parseInt(formData.currentStock),
        reorderLevel: parseInt(formData.reorderLevel),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Product Image Upload */}
          <div className="mb-6">
            <Label htmlFor="image" className="block text-sm font-medium mb-2">
              Product Image
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Product preview" 
                    className="h-32 w-32 mx-auto object-cover rounded-md" 
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData({ ...formData, image: '' });
                    }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 5MB
                  </p>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => document.getElementById('image')?.click()}
                  >
                    Select Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="sku" className="block text-sm font-medium mb-2">
                SKU <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sku"
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., ELEC-001"
                required
              />
            </div>

            <div>
              <Label htmlFor="name" className="block text-sm font-medium mb-2">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., MacBook Pro 14"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="category" className="block text-sm font-medium mb-2">
                Category
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unitOfMeasure" className="block text-sm font-medium mb-2">
                Unit of Measure <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unitOfMeasure"
                type="text"
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                placeholder="e.g., kg, units, liters"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="currentStock" className="block text-sm font-medium mb-2">
                Current Stock <span className="text-destructive">*</span>
              </Label>
              <Input
                id="currentStock"
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="reorderLevel" className="block text-sm font-medium mb-2">
                Reorder Level <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reorderLevel"
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="costPrice" className="block text-sm font-medium mb-2">
                Cost Price
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="sellingPrice" className="block text-sm font-medium mb-2">
                Selling Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description..."
              rows={4}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStockStatus, setFilterStockStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchTerm, filterCategory, filterStockStatus, sortBy, filterLowStock]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      let url = "/api/products?limit=100";
      
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filterCategory !== "all") url += `&category=${filterCategory}`;
      if (filterStockStatus !== "all") url += `&stockStatus=${filterStockStatus}`;
      if (filterLowStock) url += `&lowStock=true`;
      if (sortBy) url += `&sortBy=${sortBy}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/categories?limit=100", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories");
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save product");
      }

      toast.success(
        editingProduct ? "Product updated successfully" : "Product created successfully"
      );
      
      fetchProducts();
      setEditingProduct(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product");
      throw error;
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete product");

      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const isLowStock = (product: Product) => product.currentStock <= product.reorderLevel;
  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) return "Out of Stock";
    if (isLowStock(product)) return "Low Stock";
    return "In Stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return "default";
      case 'Low Stock':
        return "secondary";
      case 'Out of Stock':
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStockBarColor = (stock: number, reorderLevel: number) => {
    if (stock === 0) return "bg-red-500";
    if (stock <= reorderLevel) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStockPercentage = (stock: number, reorderLevel: number) => {
    const maxStock = reorderLevel * 3;
    return Math.min((stock / maxStock) * 100, 100);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-background border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={openAddModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStockStatus} onValueChange={setFilterStockStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Status</SelectItem>
                <SelectItem value="inStock">In Stock</SelectItem>
                <SelectItem value="lowStock">Low Stock</SelectItem>
                <SelectItem value="outOfStock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                <SelectItem value="stockHigh">Stock (High to Low)</SelectItem>
                <SelectItem value="stockLow">Stock (Low to High)</SelectItem>
                <SelectItem value="priceHigh">Price (High to Low)</SelectItem>
                <SelectItem value="priceLow">Price (Low to High)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={filterLowStock ? "default" : "outline"}
              onClick={() => setFilterLowStock(!filterLowStock)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock
            </Button>
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
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== "all" || filterLowStock
                  ? "Try adjusting your filters"
                  : "Get started by creating your first product"}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {categories.find(c => c.id === product.categoryId)?.name || "No category"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{product.currentStock}</span>
                        {isLowStock(product) && (
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.reorderLevel}</TableCell>
                    <TableCell>{product.unitOfMeasure}</TableCell>
                    <TableCell>${product.costPrice}</TableCell>
                    <TableCell>${product.sellingPrice}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(getStockStatus(product))}>
                        {getStockStatus(product)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-16 w-16 text-blue-500/50" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{product.sku}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                        {categories.find(c => c.id === product.categoryId)?.name || "No category"}
                      </span>
                    </div>
                    <h3 className="font-medium mb-3 line-clamp-2 min-h-[3rem]">{product.name}</h3>
                    <div className="mb-3">
                      <Badge variant={getStatusColor(getStockStatus(product))}>
                        {getStockStatus(product)}
                      </Badge>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Stock Level</span>
                        <span>{product.currentStock} units</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getStockBarColor(
                            product.currentStock,
                            product.reorderLevel
                          )}`}
                          style={{ width: `${getStockPercentage(product.currentStock, product.reorderLevel)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span>${product.sellingPrice}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Modal */}
      {isAddModalOpen && (
        <AddProductModal
          onClose={closeModal}
          editingProduct={editingProduct}
          categories={categories}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}