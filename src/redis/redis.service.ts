import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.redis.set(key, value, 'EX', ttlSeconds);
    }
    return this.redis.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async getInfo(): Promise<{ role: string; connectedSlaves: string }> {
    const info = await this.redis.info('replication');
    const role = info.match(/role:(\w+)/)?.[1] ?? 'unknown';
    const connectedSlaves = info.match(/connected_slaves:(\d+)/)?.[1] ?? '0';
    return { role, connectedSlaves };
  }
}
