import { firestore } from './firestore';
import { auth } from '../firebase';

export interface ReportData {
  targetType: 'user' | 'companion' | 'post' | 'comment' | 'story' | 'booking' | 'safety' | 'other';
  targetId: string;
  reason: string;
  details?: Record<string, unknown>;
}

export const reportService = {
  async submitReport(data: ReportData): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to submit a report');

    const reportId = `report_${Date.now()}_${user.uid}`;
    await firestore.setDocument(`reports/${reportId}`, {
      reporterId: user.uid,
      reporterEmail: user.email,
      ...data,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return reportId;
  },

  async getUserReports(userId: string): Promise<any[]> {
    return firestore.getDocuments('reports', {
      where: [{ field: 'reporterId', operator: '==', value: userId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: 50,
    });
  },
};
