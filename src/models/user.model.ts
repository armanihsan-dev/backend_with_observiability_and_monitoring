export interface User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
    is_active: boolean;
    role: 'user' | 'admin' | 'moderator';
}

export interface CreateUserDTO {
    name: string;
    email: string;
    password: string;
    role?: 'user' | 'admin' | 'moderator';
}

export interface UpdateUserDTO {
    name?: string;
    email?: string;
    password?: string;
    role?: 'user' | 'admin' | 'moderator';
    is_active?: boolean;
}

export interface LoginUserDTO {
    email: string;
    password: string;
}