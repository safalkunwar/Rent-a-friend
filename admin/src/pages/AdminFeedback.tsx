import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Star } from 'lucide-react';
import { AdminNotificationRow, AdminFeedbackItem } from '../types';
import { adminRepository } from '../repositories/AdminRepository';

export function AdminFeedback() {
  const [notifications, setNotifications] = useState<AdminNotificationRow[]>([]);
  const [feedbackItems, setFeedbackItems] = useState<AdminFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [notifs, feedback] = await Promise.all([
        adminRepository.listNotifications(100),
        adminRepository.listFeedback(100),
      ]);
      setNotifications(notifs as AdminNotificationRow[]);
      setFeedbackItems(feedback.items as AdminFeedbackItem[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleReply = async (id: string) => {
    await adminRepository.updateFeedbackStatus(id, 'read');
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, status: 'read' } : f));
  };

  const handleResolve = async (id: string) => {
    await adminRepository.updateFeedbackStatus(id, 'resolved');
    setFeedbackItems(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' } : f));
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      if (n.id && !n.isRead) {
        await adminRepository.markNotificationRead(n.id);
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Feedback & Support */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col h-[70vh]">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary-action" /> User Feedback & Reports</h3>
        </div>
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && feedbackItems.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No feedback yet.</p>}
          {feedbackItems.map((item, idx) => (
            <div key={`${item.id || 'fb'}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token">
               <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                     <span className="font-medium text-sm text-text-primary">{item.user}</span>
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.type === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-primary-action/10 text-primary-action'}`}>
                       {item.type}
                     </span>
                  </div>
                  <span className="text-xs text-gray-500">{item.date}</span>
               </div>
               {item.rating && (
                 <div className="flex items-center gap-1 mb-2">
                   {[...Array(5)].map((_, i) => (
                     <Star key={i} className={`w-3 h-3 ${i < item.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`} />
                   ))}
                 </div>
               )}
               <p className="text-sm text-gray-300 leading-relaxed">{item.message}</p>
               <div className="mt-3 flex gap-2">
                 <button onClick={() => handleReply(item.id)} className="text-xs font-medium text-primary-action hover:underline">Reply</button>
                 <button onClick={() => handleResolve(item.id)} className="text-xs font-medium text-gray-500 hover:text-text-primary transition-colors">Mark Resolved</button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Notifications */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col h-[70vh]">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Bell className="w-4 h-4 text-primary-action" /> System Notifications</h3>
          <button onClick={handleMarkAllRead} className="text-xs text-gray-500 hover:text-text-primary transition-colors">Mark all read</button>
        </div>
        <div className="divide-y divide-border-token overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && notifications.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No notifications yet.</p>}
          {notifications.map((notification, idx) => (
            <div key={`${notification.id || 'notif'}-${idx}`} className={`p-5 hover:bg-surface transition-colors ${!notification.isRead ? 'bg-primary-action/5' : ''}`}>
               <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-text-primary' : 'font-medium text-gray-300'}`}>{notification.title}</h4>
                  <span className="text-xs text-gray-500">{new Date(notification.timestamp).toLocaleString()}</span>
               </div>
               <p className="text-sm text-gray-400">{notification.message}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
