import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const city = searchParams.get('city') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '25', 10)));
  const offset = (page - 1) * limit;

  try {
    const dataQuery = `
      SELECT id, name, category, city, address, rating, reviews_count, site, phone
      FROM companies
      WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
        AND ($2::text = '' OR city = $2)
      ORDER BY id ASC
      LIMIT $3 OFFSET $4;
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM companies
      WHERE ($1::text = '' OR name ILIKE '%' || $1 || '%')
        AND ($2::text = '' OR city = $2);
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [search, city, limit, offset]),
      pool.query(countQuery, [search, city]),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Database error fetching companies' },
      { status: 500 }
    );
  }
}
