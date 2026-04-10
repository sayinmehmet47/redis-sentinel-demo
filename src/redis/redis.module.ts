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
        // NOTE: these hostnames resolve only when the app runs inside the
        // `redis-net` Docker network (see docker-compose.yml `app` service).
        // Running the app from the host with `localhost:2638x` will fail,
        // because sentinels return the master as `172.28.0.2`, which is
        // not routable from outside the Docker bridge. See README.
        const client = new Redis({
          sentinels: [
            { host: 'sentinel-1', port: 26379 },
            { host: 'sentinel-2', port: 26379 },
            { host: 'sentinel-3', port: 26379 },
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
    RedisService,
  ],
  controllers: [RedisController],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
