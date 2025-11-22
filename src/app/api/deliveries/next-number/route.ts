import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliveries } from '@/db/schema';
import { like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const year = new Date().getFullYear();
    const prefix = `DEL-${year}-`;

    // Fetch delivery numbers for the current year
    const rows: Array<{ deliveryNumber: string }> = await db
      .select({ deliveryNumber: deliveries.deliveryNumber })
      .from(deliveries)
      .where(like(deliveries.deliveryNumber, `${prefix}%`));

    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.deliveryNumber.split('-');
      const seqStr = parts[2];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    const nextSeq = maxSeq + 1;
    const next = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    return NextResponse.json({ next }, { status: 200 });
  } catch (error) {
    console.error('Error generating next delivery number:', error);
    return NextResponse.json({ error: 'Failed to compute next delivery number' }, { status: 500 });
  }
}
