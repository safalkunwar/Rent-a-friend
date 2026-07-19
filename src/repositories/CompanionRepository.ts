import { firestore } from '../services/firestore';
import { BaseRepository } from './base';
import { OperationType } from '../services/firestore-errors';
import { Companion } from '../types';

export class CompanionRepository extends BaseRepository {
  async getCompanions(options: { location?: string; limitCount?: number } = {}): Promise<Companion[]> {
    const whereCond = options.location ? [{ field: 'location', operator: '==', value: options.location }] : undefined;
    return this.executeWithRetry(
      () => firestore.getDocuments<Companion>('companions', {
        where: whereCond as any,
        limitCount: options.limitCount || 50
      }),
      OperationType.LIST,
      'companions'
    );
  }

  async createCompanionProfile(companion: Omit<Companion, 'id'>, customId?: string): Promise<string> {
    const id = customId || `comp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const newCompanion: Companion = {
      ...companion,
      id,
      rating: companion.rating || 5.0,
      reviewsCount: companion.reviewsCount || 0,
      isVerified: companion.isVerified || false,
    } as any;

    await this.executeWithRetry(
      () => firestore.setDocument(`companions/${id}`, {
        ...newCompanion,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
      OperationType.CREATE,
      `companions/${id}`
    );

    return id;
  }

  async editCompanionProfile(id: string, updates: Partial<Companion>): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`companions/${id}`, {
        ...updates,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `companions/${id}`
    );
  }

  async updateCompanionAvailability(id: string, availableDays: string[]): Promise<void> {
    await this.executeWithRetry(
      () => firestore.updateDocument(`companions/${id}`, {
        availableDays,
        updatedAt: new Date().toISOString()
      }),
      OperationType.UPDATE,
      `companions/${id}`
    );
  }
}

export const companionRepository = new CompanionRepository();
