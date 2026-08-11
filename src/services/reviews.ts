import { firestore } from './firestore';
import { Review } from '../types';

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}

export const reviewService = {
  async addReviewToCompanion(companionId: string, review: Omit<Review, 'id' | 'date'>): Promise<string> {
    const id = `review-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const newReview: Review = {
      ...review,
      id,
      date: timestamp,
    };

    const companion = await firestore.getDocument<any>(`companions/${companionId}`);
    const existingReviews = companion?.reviews || [];

    await firestore.updateDocument(`companions/${companionId}`, {
      reviews: [...existingReviews, newReview],
      updatedAt: timestamp,
    });

    await this.recalculateCompanionRating(companionId);

    return id;
  },

  async recalculateCompanionRating(companionId: string): Promise<void> {
    const companion = await firestore.getDocument<any>(`companions/${companionId}`);
    const reviews = companion?.reviews || [];

    if (reviews.length === 0) {
      await firestore.updateDocument(`companions/${companionId}`, {
        rating: 0,
        reviewsCount: 0,
      });
      return;
    }

    const sum = reviews.reduce((acc: number, r: Review) => acc + r.rating, 0);
    const average = sum / reviews.length;

    await firestore.updateDocument(`companions/${companionId}`, {
      rating: Math.round(average * 10) / 10,
      reviewsCount: reviews.length,
    });
  },

  async getReviewStats(companionId: string): Promise<ReviewStats> {
    const companion = await firestore.getDocument<any>(`companions/${companionId}`);
    const reviews = companion?.reviews || [];

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const sum = reviews.reduce((acc: number, r: Review) => acc + r.rating, 0);
    const average = sum / reviews.length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r: Review) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    return {
      averageRating: Math.round(average * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution: distribution,
    };
  },
};
