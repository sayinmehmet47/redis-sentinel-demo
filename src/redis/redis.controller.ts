import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiProperty } from '@nestjs/swagger';
import { RedisService } from './redis.service';

class SetKeyDto {
  @ApiProperty({ example: 'hello' })
  key!: string;

  @ApiProperty({ example: 'world' })
  value!: string;

  @ApiProperty({ required: false, example: 60, description: 'TTL in seconds' })
  ttl?: number;
}

@ApiTags('redis')
@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get('info')
  async getInfo() {
    return this.redisService.getInfo();
  }

  @Post()
  async set(@Body() body: SetKeyDto) {
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
