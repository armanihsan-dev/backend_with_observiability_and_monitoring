
import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_NEON,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
};

export const pool = new Pool(poolConfig);


export const connectDB = async () => {
    try {
        const client = await pool.connect()
        console.log('✅ Database connected successfully');
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        throw err;
    }
}

export const query = (text: string, params?: any[]) => pool.query(text, params);