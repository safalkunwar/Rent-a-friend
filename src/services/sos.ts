import { firestore } from './firestore';
import { auth } from '../firebase';
import { requireUid } from './identity';

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
    const uid = requireUid();

    const alertId = `sos_${crypto.randomUUID()}`;
    await firestore.setDocument(`sosAlerts/${alertId}`, {
      userId: uid,
      userEmail: auth.currentUser?.email || '',
      ...(data.bookingId ? { bookingId: data.bookingId } : {}),
      ...(data.location ? { location: data.location } : {}),
      ...(data.message ? { message: data.message } : {}),
      severity: data.severity,
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
