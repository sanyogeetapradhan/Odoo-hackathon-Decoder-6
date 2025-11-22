import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliveries, warehouses, deliveryItems, products } from '@/db/schema';
import { eq, like, and, or, desc, gte, lte } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_STATUSES = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const delivery = await db.select()
        .from(deliveries)
        .where(eq(deliveries.id, parseInt(id)))
        .limit(1);

      if (delivery.length === 0) {
        return NextResponse.json({ 
          error: 'Delivery not found',
          code: 'NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(delivery[0], { status: 200 });
    }

    // List with filtering
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const warehouseId = searchParams.get('warehouse');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Build query conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(deliveries.status, status));
    }

    if (warehouseId) {
      if (isNaN(parseInt(warehouseId))) {
        return NextResponse.json({ 
          error: "Valid warehouse ID is required",
          code: "INVALID_WAREHOUSE_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(deliveries.warehouseId, parseInt(warehouseId)));
    }

    if (dateFrom) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}/.test(dateFrom)) {
        return NextResponse.json({ 
          error: "Invalid dateFrom format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      conditions.push(gte(deliveries.createdAt, dateFrom));
    }

    if (dateTo) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}/.test(dateTo)) {
        return NextResponse.json({ 
          error: "Invalid dateTo format. Use YYYY-MM-DD",
          code: "INVALID_DATE_FORMAT" 
        }, { status: 400 });
      }
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(deliveries.createdAt, endDate.toISOString().split('T')[0]));
    }

    if (search) {
      const searchCondition = or(
        like(deliveries.deliveryNumber, `%${search}%`),
        like(deliveries.customerName, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    let query = db.select().from(deliveries);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(deliveries.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryNumber, warehouseId, customerName, status, notes, createdBy } = body;

    // Security check: reject if userId or user_id provided in body
    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!deliveryNumber || typeof deliveryNumber !== 'string' || deliveryNumber.trim() === '') {
      return NextResponse.json({ 
        error: "deliveryNumber is required and must be a non-empty string",
        code: "MISSING_DELIVERY_NUMBER" 
      }, { status: 400 });
    }

    if (!warehouseId || isNaN(parseInt(String(warehouseId)))) {
      return NextResponse.json({ 
        error: "Valid warehouseId is required",
        code: "MISSING_WAREHOUSE_ID" 
      }, { status: 400 });
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      return NextResponse.json({ 
        error: "customerName is required and must be a non-empty string",
        code: "MISSING_CUSTOMER_NAME" 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
        code: "INVALID_STATUS" 
      }, { status: 400 });
    }

    // Check if deliveryNumber already exists
    const existingDelivery = await db.select()
      .from(deliveries)
      .where(eq(deliveries.deliveryNumber, deliveryNumber.trim()))
      .limit(1);

    if (existingDelivery.length > 0) {
      return NextResponse.json({ 
        error: "Delivery number already exists",
        code: "DUPLICATE_NUMBER" 
      }, { status: 409 });
    }

    // Validate warehouse exists
    const warehouse = await db.select()
      .from(warehouses)
      .where(eq(warehouses.id, parseInt(String(warehouseId))))
      .limit(1);

    if (warehouse.length === 0) {
      return NextResponse.json({ 
        error: "Warehouse not found",
        code: "WAREHOUSE_NOT_FOUND" 
      }, { status: 400 });
    }

    // Prepare insert data
    const insertData = {
      deliveryNumber: deliveryNumber.trim(),
      warehouseId: parseInt(String(warehouseId)),
      customerName: customerName.trim(),
      status: status || 'draft',
      notes: notes ? String(notes).trim() : null,
      createdBy: createdBy || user.id,
      createdAt: new Date().toISOString(),
      validatedAt: null
    };

    const newDelivery = await db.insert(deliveries)
      .values(insertData)
      .returning();

    const created = newDelivery[0];

    // If items provided, validate and insert into delivery_items
    if (Array.isArray(body.items) && body.items.length > 0) {
      const itemsToInsert: any[] = [];
      for (const it of body.items) {
        const { productId, quantity, unitPrice } = it;

        // Validate product exists
        const prod = await db.select().from(products).where(eq(products.id, parseInt(String(productId)))).limit(1);
        if (prod.length === 0) {
          return NextResponse.json({ error: `Product ID ${productId} not found`, code: 'PRODUCT_NOT_FOUND' }, { status: 400 });
        }

        if (isNaN(parseInt(String(quantity))) || parseInt(String(quantity)) <= 0) {
          return NextResponse.json({ error: 'Item quantity must be a positive integer', code: 'INVALID_ITEM_QUANTITY' }, { status: 400 });
        }

        itemsToInsert.push({
          deliveryId: created.id,
          productId: parseInt(String(productId)),
          quantity: parseInt(String(quantity)),
          unitPrice: unitPrice !== undefined && unitPrice !== null ? Number(unitPrice) : 0,
          createdAt: new Date().toISOString(),
        });
      }

      if (itemsToInsert.length > 0) {
        await db.insert(deliveryItems).values(itemsToInsert);
      }
    }

    return NextResponse.json(created, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    
    // Handle unique constraint violations
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: "Delivery number already exists",
        code: "DUPLICATE_NUMBER" 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}