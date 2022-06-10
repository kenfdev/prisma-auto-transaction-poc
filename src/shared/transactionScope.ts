export interface TransactionScope {
  run(fn: () => Promise<void>): Promise<void>;
}
