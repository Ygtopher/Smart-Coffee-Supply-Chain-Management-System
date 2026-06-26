import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../config/db';

// GET /api/notifications — get all notifications for the current user
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
};

// PATCH /api/notifications/:id/read — mark one as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.id as string;
    const userId = req.user?.userId;
    const notification = await prisma.notification.findFirst({
      where: { notificationId, userId },
    });
    if (!notification) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    const updated = await prisma.notification.update({
      where: { notificationId },
      data: { read: true },
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/notifications/read-all — mark all as read for user
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/notifications — internal helper to create a notification (used by other controllers)
export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};
