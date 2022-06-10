import { Order } from '../domain/order';

export interface OrderRepository {
  create(order: Order): Promise<void>;
}
