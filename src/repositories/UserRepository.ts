import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { User } from '../types';

export class UserRepository extends BaseRepository {
  async getUserProfile(id: string): Promise<User | null> {
    return this.executeWithRetry(
      () => firestore.getDocument<User>(`users/${id}`),
      OperationType.GET,
      `users/${id}`
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.executeWithRetry(
      () => firestore.getDocuments<User>('users', {
        where: [{ field: 'email', operator: '==', value: email }],
        limitCount: 1,
      }).then(users => users[0] || null),
      OperationType.GET,
      `users/by_email/${email}`
    );
  }

  async updateUserProfile(id: string, updates: Partial<User & { 
    phone?: string; 
    bio?: string;
    languages?: string[];
    skills?: string[];
    availability?: string;
    interests?: string[];
    location?: string;
  }>): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`users/${id}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `users/${id}`
    );
  }

  async updateFavorites(id: string, favorites: string[]): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`users/${id}`, {
        favorites,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `users/${id}`
    );
  }
}

export const userRepository = new UserRepository();
