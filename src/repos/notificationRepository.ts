export interface NotificationRepository {
  send(message: string): Promise<void>;
}
