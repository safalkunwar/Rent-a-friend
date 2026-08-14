import { firestore } from './firestore';
import { auth } from '../firebase';

export interface SOSAlertData {
  bookingId?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  message?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const sosService = {
  async createAlert(data: SOSAlertData): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to trigger SOS');

    const alertId = `sos_${Date.now()}_${user.uid}`;
    await firestore.setDocument(`sosAlerts/${alertId}`, {
      userId: user.uid,
      userEmail: user.email,
      ...data,
      status: 'active',
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return alertId;
  },

  async getUserAlerts(userId: string): Promise<any[]> {
    return firestore.getDocuments('sosAlerts', {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderByField: 'timestamp',
      orderDirection: 'desc',
      limitCount: 50,
    });
  },

  async updateAlertStatus(alertId: string, status: string): Promise<void> {
    await firestore.updateDocument(`sosAlerts/${alertId}`, {
      status,
      updatedAt: new Date().toISOString(),
    });
  },
};
