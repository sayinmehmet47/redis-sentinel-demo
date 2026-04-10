# Redis Sentinel Demo

Small demo project for running Redis with:

- 1 Redis master
- 2 Redis replicas
- 3 Redis Sentinel nodes
- fixed container IPs for predictable failover behavior

## Services

The Docker Compose setup creates these nodes:

- `redis-master` -> `172.28.0.2:6379`
- `redis-replica-1` -> `172.28.0.3:6379`
- `redis-replica-2` -> `172.28.0.4:6379`
- `sentinel-1` -> `172.28.0.5:26379`
- `sentinel-2` -> `172.28.0.6:26379`
- `sentinel-3` -> `172.28.0.7:26379`

Sentinel quorum is `2`.

## Start

```bash
docker compose up -d
```

Check running containers:

```bash
docker compose ps
```

## Stop

```bash
docker compose down -v
```

## Check Current Master

Ask Sentinel which Redis node is the current master:

```bash
docker compose exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

## Check Replication Role

```bash
docker compose exec redis-master redis-cli INFO replication
docker compose exec redis-replica-1 redis-cli INFO replication
docker compose exec redis-replica-2 redis-cli INFO replication
```

Look for `role:master` or `role:slave`.

## Test Failover

Stop the current master:

```bash
docker compose stop redis-master
```

Or if another node is master, stop that service instead.

Then check the new master:

```bash
docker compose exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

View Sentinel logs:

```bash
docker compose logs --no-color sentinel-1 sentinel-2 sentinel-3
```

Typical failover log lines:

- `+sdown`
- `+odown`
- `+selected-slave`
- `+promoted-slave`
- `+switch-master`

## Quorum

This demo uses:

```conf
sentinel monitor mymaster 172.28.0.2 6379 2
```

The last value, `2`, is the quorum. At least 2 Sentinels must agree that the master is down before failover starts.

## Make `redis-master` Preferred Again

After failover, `redis-master` does not automatically become master again. To make it the preferred promotion target for the next failover:

```bash
docker compose exec redis-master redis-cli CONFIG SET replica-priority 10
docker compose exec redis-replica-1 redis-cli CONFIG SET replica-priority 100
```

Lower `replica-priority` means a better chance of promotion.

## Publish To GitHub With CLI

If `gh` is installed:

```bash
git add .
git commit -m "Initial commit"
gh auth login
gh repo create redis-sentinel-demo --public --source=. --remote=origin --push
```

## App Commands

This repo also includes a NestJS app.

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run start:dev
```

Run tests:

```bash
npm test
```
