# How to restore the database

These instructions explain how to restore a database backup into your local Docker environment.

## Steps

All commands should be run from the root of the project.

### 1. Find the container name

```bash
docker ps
```

Look for the container running the `postgres` image. The name will be in the last column (e.g. `s-index-web-app-postgres-1`). Use that name in the commands below.

### 2. Copy the backup into the container

```bash
docker cp ./backup_06_05_2026.dir <container_name>:/tmp/backup_dir
```

### 3. Restore the database

```bash
docker exec -t <container_name> pg_restore -U admin -Fd -j 4 -d s_index_local /tmp/backup_dir
```

This restores the `s_index_local` database from the backup using 4 parallel jobs.

### 4. Clean up

```bash
docker exec <container_name> rm -rf /tmp/backup_dir
```

## Summary

| Step | What it does |
| ---- | ----------- |
| `docker ps` | Finds the name of the running database container |
| `docker cp` | Moves the backup into the container |
| `pg_restore` | Restores the data into the database |
| `rm -rf` | Cleans up the temporary backup files inside the container |
