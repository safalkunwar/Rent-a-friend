export function notificationTarget(notification: { targetType?: string; targetId?: string; commentId?: string }): string | null {
  if (!['story', 'event'].includes(notification.targetType || '') || !/^[a-zA-Z0-9_-]+$/.test(notification.targetId || '')) return null;
  return `/${notification.targetType}/${notification.targetId}${notification.commentId ? '?comments=1' : ''}`;
}
