import { query } from '../config/database';
import { redisService } from './redis.service';
import { User, CreateUserDTO, UpdateUserDTO } from '../models/user.model';
import bcrypt from 'bcryptjs';
import { dbQueryDuration, userActivityCounter } from '../config/metrics';

export class UserService {
    private static instance: UserService;

    static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async findById(id: string): Promise<User | null> {
        const startTime = Date.now();
        try {
            // Try cache first
            const cached = await redisService.get<User>(`user:${id}`);
            if (cached) {
                dbQueryDuration
                    .labels('user_find_by_id_cache')
                    .observe((Date.now() - startTime) / 1000);
                return cached;
            }

            // Query database
            const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [id]);

            dbQueryDuration
                .labels('user_find_by_id_db')
                .observe((Date.now() - startTime) / 1000);

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];

            // Cache user
            await redisService.set(`user:${id}`, user, 3600);

            return user;
        } catch (error) {
            dbQueryDuration
                .labels('user_find_by_id_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error finding user:', error);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        const startTime = Date.now();
        try {
            const result = await query('SELECT * FROM users WHERE email = $1', [email]);

            dbQueryDuration
                .labels('user_find_by_email')
                .observe((Date.now() - startTime) / 1000);

            return result.rows[0] || null;
        } catch (error) {
            dbQueryDuration
                .labels('user_find_by_email_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    async create(data: CreateUserDTO): Promise<User> {
        const startTime = Date.now();
        try {
            const { name, email, password, role = 'user' } = data;

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const result = await query(
                `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
                [name, email, password_hash, role]
            );

            dbQueryDuration
                .labels('user_create')
                .observe((Date.now() - startTime) / 1000);

            userActivityCounter
                .labels('register', result.rows[0].id)
                .inc();

            return result.rows[0];
        } catch (error) {
            dbQueryDuration
                .labels('user_create_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async update(id: string, data: UpdateUserDTO): Promise<User | null> {
        const startTime = Date.now();
        try {
            const updates: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            if (data.name) {
                updates.push(`name = $${paramCount}`);
                values.push(data.name);
                paramCount++;
            }

            if (data.email) {
                updates.push(`email = $${paramCount}`);
                values.push(data.email);
                paramCount++;
            }

            if (data.password) {
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(data.password, salt);
                updates.push(`password_hash = $${paramCount}`);
                values.push(password_hash);
                paramCount++;
            }

            if (data.role) {
                updates.push(`role = $${paramCount}`);
                values.push(data.role);
                paramCount++;
            }

            if (data.is_active !== undefined) {
                updates.push(`is_active = $${paramCount}`);
                values.push(data.is_active);
                paramCount++;
            }

            if (updates.length === 0) {
                return this.findById(id);
            }

            updates.push(`updated_at = NOW()`);
            values.push(id);

            const result = await query(
                `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${values.length}
         RETURNING *`,
                values
            );

            dbQueryDuration
                .labels('user_update')
                .observe((Date.now() - startTime) / 1000);

            if (result.rows.length === 0) {
                return null;
            }

            // Invalidate cache
            await redisService.delete(`user:${id}`);

            userActivityCounter
                .labels('update', id)
                .inc();

            return result.rows[0];
        } catch (error) {
            dbQueryDuration
                .labels('user_update_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async delete(id: string): Promise<boolean> {
        const startTime = Date.now();
        try {
            const result = await query('DELETE FROM users WHERE id = $1', [id]);

            dbQueryDuration
                .labels('user_delete')
                .observe((Date.now() - startTime) / 1000);

            // Invalidate cache
            await redisService.delete(`user:${id}`);

            userActivityCounter
                .labels('delete', id)
                .inc();

            return result.rowCount !== null && result.rowCount > 0;
        } catch (error) {
            dbQueryDuration
                .labels('user_delete_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async getAll(limit: number = 100, offset: number = 0): Promise<User[]> {
        const startTime = Date.now();
        try {
            const result = await query(
                'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );

            dbQueryDuration
                .labels('user_get_all')
                .observe((Date.now() - startTime) / 1000);

            return result.rows;
        } catch (error) {
            dbQueryDuration
                .labels('user_get_all_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Error getting users:', error);
            throw error;
        }
    }
}

export const userService = UserService.getInstance();