import { firestore } from './firestore';
import { auth } from '../firebase';

export interface FeedbackData {
  type: 'feedback' | 'bug' | 'guide_feedback';
  message: string;
  rating?: number;
  category?: string;
}

export const feedbackService = {
  async submitFeedback(data: FeedbackData): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to submit feedback');

    const feedbackId = `feedback_${Date.now()}_${user.uid}`;
    await firestore.setDocument(`feedback/${feedbackId}`, {
      userId: user.uid,
      user: user.email || user.displayName || 'Anonymous',
      ...data,
      status: 'new',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return feedbackId;
  },

  async getUserFeedback(userId: string): Promise<any[]> {
    return firestore.getDocuments('feedback', {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: 50,
    });
  },
};
