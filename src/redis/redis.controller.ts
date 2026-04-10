import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { RedisService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('info')
  async getInfo() {
    return this.redisService.getInfo();
  }

  @Post()
  async set(@Body() body: { key: string; value: string; ttl?: number }) {
    await this.redisService.set(body.key, body.value, body.ttl);
    return { ok: true };
  }

  @Get(':key')
  async get(@Param('key') key: string) {
    const value = await this.redisService.get(key);
    return { key, value };
  }

  @Delete(':key')
  async del(@Param('key') key: string) {
    const deleted = await this.redisService.del(key);
    return { key, deleted };
  }
}
