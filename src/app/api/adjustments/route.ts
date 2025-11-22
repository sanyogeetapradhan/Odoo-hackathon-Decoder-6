import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adjustments, productStock, products } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status');
    const warehouse = searchParams.get('warehouse');
    const product = searchParams.get('product');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = db
      .select({
        id: adjustments.id,
        adjustmentNumber: adjustments.adjustmentNumber,
        warehouseId: adjustments.warehouseId,
        productId: adjustments.productId,
        productSku: products.sku,
        countedQuantity: adjustments.countedQuantity,
        systemQuantity: adjustments.systemQuantity,
        difference: adjustments.difference,
        reason: adjustments.reason,
        status: adjustments.status,
        createdAt: adjustments.createdAt,
        validatedAt: adjustments.validatedAt,
      })
      .from(adjustments)
      .leftJoin(products, eq(adjustments.productId, products.id));

    const conditions = [];

    if (status) {
      conditions.push(eq(adjustments.status, status));
    }

    if (warehouse) {
      const warehouseId = parseInt(warehouse);
      if (!isNaN(warehouseId)) {
        conditions.push(eq(adjustments.warehouseId, warehouseId));
      }
    }

    if (product) {
      const productId = parseInt(product);
      if (!isNaN(productId)) {
        conditions.push(eq(adjustments.productId, productId));
      }
    }

    if (dateFrom) {
      conditions.push(gte(adjustments.createdAt, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(adjustments.createdAt, dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(adjustments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if createdBy provided in body
    if ('createdBy' in body) {
      return NextResponse.json(
        {
          error: "User ID cannot be provided in request body",
          code: "USER_ID_NOT_ALLOWED"
        },
        { status: 400 }
      );
    }

    const { adjustmentNumber, warehouseId, productId, countedQuantity, reason, status: requestStatus } = body;

    // Validate required fields
    if (!adjustmentNumber) {
      return NextResponse.json(
        { error: "Adjustment number is required", code: "MISSING_ADJUSTMENT_NUMBER" },
        { status: 400 }
      );
    }

    if (!warehouseId) {
      return NextResponse.json(
        { error: "Warehouse ID is required", code: "MISSING_WAREHOUSE_ID" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required", code: "MISSING_PRODUCT_ID" },
        { status: 400 }
      );
    }

    if (countedQuantity === undefined || countedQuantity === null) {
      return NextResponse.json(
        { error: "Counted quantity is required", code: "MISSING_COUNTED_QUANTITY" },
        { status: 400 }
      );
    }

    // Validate countedQuantity is a number and >= 0
    const parsedCountedQuantity = parseInt(countedQuantity);
    if (isNaN(parsedCountedQuantity) || parsedCountedQuantity < 0) {
      return NextResponse.json(
        { error: "Counted quantity must be a non-negative number", code: "INVALID_COUNTED_QUANTITY" },
        { status: 400 }
      );
    }

    // Validate status if provided
    const allowedStatuses = ['draft', 'done', 'cancelled'];
    const statusValue = requestStatus || 'draft';
    if (!allowedStatuses.includes(statusValue)) {
      return NextResponse.json(
        { error: "Status must be one of: draft, done, cancelled", code: "INVALID_STATUS" },
        { status: 400 }
      );
    }

    // Check if adjustmentNumber already exists
    const existingAdjustment = await db.select()
      .from(adjustments)
      .where(eq(adjustments.adjustmentNumber, adjustmentNumber.trim()))
      .limit(1);

    if (existingAdjustment.length > 0) {
      return NextResponse.json(
        { error: "Adjustment number already exists", code: "DUPLICATE_NUMBER" },
        { status: 409 }
      );
    }

    // Fetch current stock quantity from productStock
    const stockRecord = await db.select()
      .from(productStock)
      .where(
        and(
          eq(productStock.productId, parseInt(productId)),
          eq(productStock.warehouseId, parseInt(warehouseId))
        )
      )
      .limit(1);

    const systemQuantity = stockRecord.length > 0 ? stockRecord[0].quantity : 0;

    // Calculate difference
    const difference = parsedCountedQuantity - systemQuantity;

    // Create new adjustment
    const newAdjustment = await db.insert(adjustments)
      .values({
        adjustmentNumber: adjustmentNumber.trim(),
        warehouseId: parseInt(warehouseId),
        productId: parseInt(productId),
        countedQuantity: parsedCountedQuantity,
        systemQuantity: systemQuantity,
        difference: difference,
        reason: reason ? reason.trim() : null,
        status: statusValue,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        validatedAt: null
      })
      .returning();

    return NextResponse.json(newAdjustment[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}