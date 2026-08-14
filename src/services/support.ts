import { firestore } from './firestore';
import { auth } from '../firebase';

export interface SupportTicketData {
  subject: string;
  message: string;
  category: 'booking' | 'payment' | 'account' | 'safety' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  bookingId?: string;
}

export const supportService = {
  async createTicket(data: SupportTicketData): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Must be logged in to create a support ticket');

    const ticketId = `ticket_${Date.now()}_${user.uid}`;
    await firestore.setDocument(`support_tickets/${ticketId}`, {
      userId: user.uid,
      userEmail: user.email,
      ...data,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return ticketId;
  },

  async getUserTickets(userId: string): Promise<any[]> {
    return firestore.getDocuments('support_tickets', {
      where: [{ field: 'userId', operator: '==', value: userId }],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount: 50,
    });
  },
};
