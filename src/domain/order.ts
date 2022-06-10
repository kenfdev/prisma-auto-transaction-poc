import { v4 as uuid } from 'uuid';

type OrderProps = {
  productIds: string[];
};

export class Order {
  private readonly _id: string;
  private readonly _props: OrderProps;

  get id(): string {
    return this._id;
  }

  get productIds(): string[] {
    return this._props.productIds;
  }

  constructor(props: OrderProps, id?: string) {
    this._props = props;
    this._id = id ? id : uuid();
  }

  static create(productIds: string[]): Order {
    return new Order({ productIds });
  }
}
