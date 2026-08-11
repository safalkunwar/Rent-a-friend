import { firestore } from './firestore';

export interface BookingReminder {
  id: string;
  bookingId: string;
  userId: string;
  companionId: string;
  reminderTime: string;
  type: '1_hour' | '24_hours' | 'custom';
  sent: boolean;
  createdAt: string;
}

const REMINDERS_COLLECTION = 'booking_reminders';

export const reminderService = {
  async createReminder(reminder: Omit<BookingReminder, 'id' | 'createdAt'>): Promise<string> {
    const id = `reminder-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    await firestore.setDocument(`${REMINDERS_COLLECTION}/${id}`, {
      ...reminder,
      id,
      createdAt: timestamp,
    });

    return id;
  },

  async getUpcomingReminders(userId: string, limitCount = 10) {
    return firestore.getDocuments<BookingReminder>(REMINDERS_COLLECTION, {
      where: [
        { field: 'userId', operator: '==', value: userId },
        { field: 'sent', operator: '==', value: false },
      ],
      orderByField: 'reminderTime',
      orderDirection: 'asc',
      limitCount,
    });
  },

  async markReminderSent(reminderId: string): Promise<void> {
    await firestore.updateDocument(`${REMINDERS_COLLECTION}/${reminderId}`, {
      sent: true,
      sentAt: new Date().toISOString(),
    });
  },

  async deleteReminder(reminderId: string): Promise<void> {
    await firestore.deleteDocument(`${REMINDERS_COLLECTION}/${reminderId}`);
  },
};
