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

This repo also includes a NestJS app that talks to Redis through Sentinel
using `ioredis`. The app runs as a container on the same Docker network as
Redis — see the "Docker + Sentinel gotcha" section below for why.

Start everything (Redis, sentinels, and the app):

```bash
docker compose up -d --build
```

Check the app is connected:

```bash
curl localhost:3000/redis/info
# -> {"role":"master","connectedSlaves":"2"}
```

Set and get a key:

```bash
curl -X POST localhost:3000/redis -H 'Content-Type: application/json' \
  -d '{"key":"hello","value":"world"}'

curl localhost:3000/redis/hello
# -> {"key":"hello","value":"world"}
```

Tail app logs (useful while testing failover):

```bash
docker compose logs -f app
```

Run tests locally (on the host, no Docker needed):

```bash
npm install
npm test
```

## The Docker + Sentinel Gotcha

The first instinct is to run the Nest app on the host with
`localhost:26379/26380/26381` as the sentinel list. It looks like it should
work — the sentinel ports are published, and `redis-cli -p 26379 ping` from
the host responds with `PONG`.

But the app fails with:

```
[Redis] Error: connect ETIMEDOUT
[Redis] Error: All sentinels are unreachable.
```

Here is what actually happens:

1. `ioredis` connects to `localhost:26379` — **this works**.
2. It asks the sentinel: "where is the master?"
3. The sentinel replies with the address it has on file: `172.28.0.2:6379`.
4. `ioredis` tries to connect to `172.28.0.2:6379` from the host — **ETIMEDOUT**,
   because that IP only exists inside the Docker bridge network.
5. After retrying every sentinel with the same result, `ioredis` prints the
   misleading `"All sentinels are unreachable"` error. The sentinels are
   perfectly reachable; the **master address they hand out** is not.

This is the number-one pitfall with Redis Sentinel behind Docker.

### The fix used in this repo

Run the app on the same Docker network as Redis, so `172.28.0.2` is routable:

- The `app` service in `docker-compose.yml` joins `redis-net`.
- `src/redis/redis.module.ts` uses the container hostnames
  (`sentinel-1`, `sentinel-2`, `sentinel-3`) on port `26379` — **not** the
  host-published ports `26380` / `26381`.

### Other options (for reference)

- Use `sentinel announce-ip` / `replica-announce-ip` to have each node
  advertise a host-reachable address. This is fiddly because every node
  needs a unique host-reachable address, and on macOS/Windows you cannot
  route to the `172.28.0.0/16` subnet at all.
- Use `network_mode: host` on the Redis containers (Linux only).

For a learning demo, putting the app on the Redis network is by far the
simplest and also the most realistic — in production your app is almost
always on the same network as Redis.
