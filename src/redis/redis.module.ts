import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisController } from './redis.controller';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const client = new Redis({
          sentinels: [
            { host: 'localhost', port: 26379 },
            { host: 'localhost', port: 26380 },
            { host: 'localhost', port: 26381 },
          ],
          name: 'mymaster',
          sentinelRetryStrategy: (times) => Math.min(times * 100, 3000),
        });

        client.on('connect', () => console.log('[Redis] Connected to master'));
        client.on('ready', () => console.log('[Redis] Ready'));
        client.on('error', (err) =>
          console.error('[Redis] Error:', err.message),
        );
        client.on('reconnecting', () => console.log('[Redis] Reconnecting...'));

        return client;
      },
    },
  ],
  controllers: [RedisController],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
