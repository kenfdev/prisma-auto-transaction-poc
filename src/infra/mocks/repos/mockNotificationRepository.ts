import { NotificationRepository } from '../../../repos/notificationRepository';

export const MockNotificationRepository = jest.fn<
  jest.Mocked<NotificationRepository>,
  []
>(() => ({
  send: jest.fn(),
}));
