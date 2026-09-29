# Troubleshooting: Dev Services Not Reachable Over Tailscale

This covers the Postgres, Meilisearch, and Redis stack defined in `dev-docker-compose.yaml` on the `s-index-resources` server.

## Symptoms

- Containers show as `Up` in `docker ps`, but the `PORTS` column is **empty**.
- Nothing is listening on the published ports:

  ```bash
  ss -tlnp | grep -E '43997|42341|44001'
  # (no output)
  ```

- Connections fail even from the server itself:

  ```bash
  nc -vz 100.96.211.6 43997
  # Connection refused
  ```

- `docker compose ps` in `~/web-app` fails with `no configuration file provided: not found`.

## Root cause

The compose file publishes each service on the server's **Tailscale IP** only:

```yaml
ports:
  - 100.96.211.6:43997:5432
```

After a server (or Docker daemon) restart, `restart: always` brings the containers back up. If Docker does this **before Tailscale has assigned `100.96.211.6` to the `tailscale0` interface**, the port bind fails with `cannot assign requested address`. The container still starts, but with no published ports.

You can confirm this because the intended binding is still recorded on the container even though it isn't active:

```bash
docker inspect web-app-postgres-1 --format '{{json .HostConfig.PortBindings}}'
# {"5432/tcp":[{"HostIp":"100.96.211.6","HostPort":"43997"}]}   <- configured

docker ps --format 'table {{.Names}}\t{{.Ports}}'
# PORTS column empty                                            <- not applied
```

And in the Docker daemon logs:

```bash
journalctl -u docker --since "1 hour ago" | grep -iE 'cannot assign|bind'
```

### Why `docker compose ps` failed

The compose file is named `dev-docker-compose.yaml`, which isn't one of the default names Compose looks for (`compose.yaml`, `docker-compose.yml`, etc.). Every compose command needs `-f dev-docker-compose.yaml`. To find which file a running container was started from:

```bash
docker inspect web-app-postgres-1 --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
```

## Quick fix

Once Tailscale is up (`tailscale ip -4` returns `100.96.211.6`), recreate the containers:

```bash
cd ~/web-app
docker compose -f dev-docker-compose.yaml up -d --force-recreate
```

Verify:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
# should show 100.96.211.6:43997->5432/tcp etc.

nc -vz 100.96.211.6 43997
nc -vz 100.96.211.6 42341
nc -vz 100.96.211.6 44001
```

### Is this safe for data?

Yes. `--force-recreate` replaces containers, not volumes. Data lives in the named volumes `web-app_postgres_data`, `web-app_meili_data`, and `web-app_redis_data`, which are reattached to the new containers.

Things that **would** lose or detach data:

- `docker compose down -v` or `docker volume rm` deletes the volumes.
- Running compose from a different directory or with a different `-p` project name creates new, empty volumes. The old data still exists but isn't attached.

To double check volumes before and after:

```bash
docker volume ls | grep web-app
docker inspect web-app-postgres-1 --format '{{range .Mounts}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}'
```

Optional backup before recreating:

```bash
docker exec web-app-postgres-1 pg_dump -U admin s_index_local > ~/s_index_backup.sql
```

## Permanent fixes

Pick one so this doesn't recur after the next reboot.

### Option A: Make Docker wait for the Tailscale IP

Keeps the compose file unchanged.

```bash
sudo systemctl edit docker
```

Add:

```ini
[Unit]
After=tailscaled.service
Wants=tailscaled.service

[Service]
ExecStartPre=/bin/sh -c 'until ip addr show tailscale0 | grep -q 100.96.211.6; do sleep 1; done'
```

Then:

```bash
sudo systemctl daemon-reload
```

`After=tailscaled.service` alone is **not** enough, because tailscaled reports as started before the IP is assigned. The `ExecStartPre` loop is what actually waits.

**Tradeoff:** if Tailscale is ever broken, Docker won't start at all.

### Option B: Bind to all interfaces and restrict with a firewall

More robust, since there's no startup ordering dependency. Change the port mappings:

```yaml
ports:
  - 43997:5432
```

Then block access from anything other than Tailscale. Docker-published ports **bypass `ufw`/`firewalld`**, so the rule must go in the `DOCKER-USER` chain:

```bash
iptables -I DOCKER-USER -p tcp -m multiport --dports 5432,7700,6379 ! -i tailscale0 -j DROP
```

Note the rule uses the **container** ports (5432, 7700, 6379), because `DOCKER-USER` sees traffic after Docker's DNAT. Persist the rule with `iptables-persistent` or equivalent.

**Tradeoff:** if the firewall rule is lost, the services become exposed on every interface, including public ones.

## Quality of life

Symlink the compose file so `-f` isn't needed:

```bash
ln -s dev-docker-compose.yaml compose.yaml
```

After that, `docker compose ps`, `docker compose logs postgres`, etc. work directly from `~/web-app`.

## Diagnostic checklist

1. `tailscale ip -4` matches `100.96.211.6`?
2. `docker ps` shows port mappings in the `PORTS` column?
3. `ss -tlnp | grep 43997` shows a listener?
4. `nc -vz 100.96.211.6 43997` works **on the server**?
5. `nc -vz 100.96.211.6 43997` works **from the client** (which must be on the tailnet)?

Where the chain breaks tells you the cause:

| Fails at | Likely cause                                               |
| -------- | ---------------------------------------------------------- |
| 1        | Tailscale down or IP changed                               |
| 2 or 3   | Boot race (see Root cause), or stack not running           |
| 5 only   | Client not on tailnet, or Tailscale ACLs blocking the port |
