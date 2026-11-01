import { Test } from '@nestjs/testing';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationsController } from '../src/modules/notifications/notifications.controller';
import { PrismaService } from '../src/common/prisma.service';

describe('Phase 16: Centralized In-App Notification Center & User Isolation', () => {
  let notificationsService: NotificationsService;
  let notificationsController: NotificationsController;

  const mockUserAlice = {
    id: 'user-alice-uuid-001',
    email: 'alice@example.com',
    role: 'authenticated',
  };

  const mockUserBob = {
    id: 'user-bob-uuid-002',
    email: 'bob@example.com',
    role: 'authenticated',
  };

  // In-memory persistent notification store for unit verification
  let notificationDb: any[] = [];

  const mockPrisma = {
    isConnected: true,
    inAppNotification: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const item = {
          id: 'notif-' + Math.random().toString(36).substring(2, 9),
          readAt: null,
          createdAt: new Date(),
          ...data,
        };
        notificationDb.push(item);
        return Promise.resolve(item);
      }),
      findMany: jest.fn().mockImplementation(({ where, take }: any) => {
        let results = notificationDb.filter((item) => item.userId === where.userId);
        if (where.category) {
          results = results.filter((item) => item.category === where.category);
        }
        if (where.readAt === null) {
          results = results.filter((item) => item.readAt === null);
        }
        return Promise.resolve(results.slice(0, take || 50));
      }),
      count: jest.fn().mockImplementation(({ where }: any) => {
        let results = notificationDb.filter((item) => item.userId === where.userId);
        if (where.category) {
          results = results.filter((item) => item.category === where.category);
        }
        if (where.readAt === null) {
          results = results.filter((item) => item.readAt === null);
        }
        return Promise.resolve(results.length);
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
        let updatedCount = 0;
        notificationDb.forEach((item) => {
          const matchUser = item.userId === where.userId;
          const matchId = !where.id || item.id === where.id;
          const matchUnread = where.readAt === null ? item.readAt === null : true;
          if (matchUser && matchId && matchUnread) {
            Object.assign(item, data);
            updatedCount++;
          }
        });
        return Promise.resolve({ count: updatedCount });
      }),
      deleteMany: jest.fn().mockImplementation(({ where }: any) => {
        const initialLen = notificationDb.length;
        notificationDb = notificationDb.filter(
          (item) => !(item.id === where.id && item.userId === where.userId),
        );
        return Promise.resolve({ count: initialLen - notificationDb.length });
      }),
    },
    pushSubscription: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    },
  };

  beforeEach(async () => {
    notificationDb = [];
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    notificationsService = moduleRef.get<NotificationsService>(NotificationsService);
    notificationsController = moduleRef.get<NotificationsController>(NotificationsController);
  });

  describe('1. In-App Notification Creation & Categorization', () => {
    it('creates persistent in-app notifications across distinct categories and severities', async () => {
      const taskNotif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Task Due Soon',
        message: 'Your Q4 Review is scheduled in 15 minutes.',
        category: 'TASKS',
        severity: 'INFO',
        actionUrl: '/work?task=task-101',
      });

      const routineNotif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Daily Habit Check-in',
        message: 'Log your hydration goal for today.',
        category: 'ROUTINES',
        severity: 'SUCCESS',
      });

      const conflictNotif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Schedule Conflict Detected',
        message: 'Dentist appointment collides with Deep Work block.',
        category: 'SCHEDULE_CONFLICT',
        severity: 'WARNING',
        actionUrl: '/planning',
      });

      expect(taskNotif.id).toBeDefined();
      expect(taskNotif.category).toBe('TASKS');
      expect(routineNotif.category).toBe('ROUTINES');
      expect(conflictNotif.category).toBe('SCHEDULE_CONFLICT');
      expect(mockPrisma.inAppNotification.create).toHaveBeenCalledTimes(3);
    });

    it('automatically persists in-app notification when notifyUser is dispatched for background reminders', async () => {
      await notificationsService.notifyUser(mockUserAlice.id, {
        title: 'Background Automation Alert',
        body: 'Overdue task auto-rescheduled to next available buffer.',
        taskId: 'task-555',
        category: 'AUTOMATION',
      });

      expect(mockPrisma.inAppNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserAlice.id,
            title: 'Background Automation Alert',
            message: 'Overdue task auto-rescheduled to next available buffer.',
            category: 'AUTOMATION',
          }),
        }),
      );
    });
  });

  describe('2. Querying, Filtering & Unread Counting', () => {
    beforeEach(async () => {
      // Seed notifications for Alice
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Task 1',
        message: 'Due now',
        category: 'TASKS',
      });
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Routine 1',
        message: 'Hydration 2000ml',
        category: 'ROUTINES',
      });
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Reminder 1',
        message: 'Team Sync in 10m',
        category: 'REMINDERS',
      });
    });

    it('returns accurate unreadCount and totalCount for the authenticated user', async () => {
      const summary = await notificationsController.getNotifications(mockUserAlice as any);

      expect(summary.totalCount).toBe(3);
      expect(summary.unreadCount).toBe(3);
      expect(summary.notifications.length).toBe(3);
    });

    it('filters notifications by specific category', async () => {
      const taskResults = await notificationsController.getNotifications(
        mockUserAlice as any,
        'TASKS',
      );

      expect(taskResults.notifications.length).toBe(1);
      expect(taskResults.notifications[0].title).toBe('Alice Task 1');
    });

    it('filters by unread-only status', async () => {
      // Mark first notification as read
      const allNotifs = await notificationsService.getNotifications(mockUserAlice.id);
      await notificationsService.markAsRead(mockUserAlice.id, allNotifs.notifications[0].id);

      const unreadResults = await notificationsController.getNotifications(
        mockUserAlice as any,
        undefined,
        'true',
      );

      expect(unreadResults.unreadCount).toBe(2);
      expect(unreadResults.notifications.length).toBe(2);
    });
  });

  describe('3. Mark as Read & Mark All as Read Operations', () => {
    it('marks a single notification as read with timestamp', async () => {
      const notif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Urgent Replan Notice',
        message: 'Calendar rebuilt successfully.',
      });

      await notificationsController.markAsRead(mockUserAlice as any, notif.id);

      expect(mockPrisma.inAppNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: notif.id, userId: mockUserAlice.id },
          data: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
    });

    it('marks all unread notifications as read in a single batch operation', async () => {
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'A1',
        message: 'M1',
      });
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'A2',
        message: 'M2',
      });

      const res = await notificationsController.markAllAsRead(mockUserAlice as any);

      expect(res.success).toBe(true);
      expect(mockPrisma.inAppNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserAlice.id, readAt: null },
          data: expect.objectContaining({ readAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('4. Multi-Tenant Isolation & Ownership Boundaries', () => {
    it('strictly isolates notifications between different users', async () => {
      // Alice creates a notification
      await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Private Alert',
        message: 'Sensitive budget report.',
      });

      // Bob creates a notification
      await notificationsService.createInAppNotification(mockUserBob.id, {
        title: 'Bob Alert',
        message: 'Public task.',
      });

      // Alice queries her notifications
      const aliceData = await notificationsController.getNotifications(mockUserAlice as any);
      expect(aliceData.totalCount).toBe(1);
      expect(aliceData.notifications[0].title).toBe('Alice Private Alert');

      // Bob queries his notifications
      const bobData = await notificationsController.getNotifications(mockUserBob as any);
      expect(bobData.totalCount).toBe(1);
      expect(bobData.notifications[0].title).toBe('Bob Alert');
      expect(bobData.notifications.some((n: any) => n.userId === mockUserAlice.id)).toBe(false);
    });

    it('prevents Bob from marking Alice notification as read', async () => {
      const aliceNotif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Confidential',
        message: 'Medical appointment.',
      });

      // Bob attempts to mark Alice's notification as read
      await notificationsController.markAsRead(mockUserBob as any, aliceNotif.id);

      // Verify Prisma query enforced `userId: mockUserBob.id`
      expect(mockPrisma.inAppNotification.updateMany).toHaveBeenCalledWith({
        where: { id: aliceNotif.id, userId: mockUserBob.id },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      });

      // Alice's notification remains unread
      const found = notificationDb.find((n) => n.id === aliceNotif.id);
      expect(found.readAt).toBeNull();
    });

    it('prevents Bob from deleting Alice notification', async () => {
      const aliceNotif = await notificationsService.createInAppNotification(mockUserAlice.id, {
        title: 'Alice Important Task',
        message: 'Do not delete.',
      });

      // Bob attempts to delete Alice's notification
      await notificationsController.deleteNotification(mockUserBob as any, aliceNotif.id);

      // Verify Prisma query enforced `userId: mockUserBob.id`
      expect(mockPrisma.inAppNotification.deleteMany).toHaveBeenCalledWith({
        where: { id: aliceNotif.id, userId: mockUserBob.id },
      });

      // Alice's notification is still present in the store
      const found = notificationDb.find((n) => n.id === aliceNotif.id);
      expect(found).toBeDefined();
    });
  });
});

