import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({ connectionString, connectionTimeoutMillis: 2000 })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'company_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

export const hasDbConfigured = Boolean(process.env.DB_HOST || process.env.DATABASE_URL);
export default pool;
export type Company = {
  id: string;
  name: string;
  category: string;
  city: string;
  address: string;
  rating: number | null;
  reviews_count: number;
  site: string | null;
  phone: string | null;
  created_at?: string;
};
