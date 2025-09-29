export interface CacheServicePort {
  get<T>(key: string);
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}
