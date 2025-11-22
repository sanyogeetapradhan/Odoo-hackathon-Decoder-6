import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transfers } from '@/db/schema';
import { like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;

    const rows: Array<{ transferNumber: string }> = await db
      .select({ transferNumber: transfers.transferNumber })
      .from(transfers)
      .where(like(transfers.transferNumber, `${prefix}%`));

    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.transferNumber.split('-');
      const seqStr = parts[2];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    const nextSeq = maxSeq + 1;
    const next = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    return NextResponse.json({ next }, { status: 200 });
  } catch (error) {
    console.error('Error generating next transfer number:', error);
    return NextResponse.json({ error: 'Failed to compute next transfer number' }, { status: 500 });
  }
}
