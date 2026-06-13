# How to run the local database

The project uses Docker to run a local PostgreSQL database. A compose file (`dev-docker-compose.yaml`) is already provided in the root of the project.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine

## Starting the database

From the root of the project, run:

```bash
docker compose -f dev-docker-compose.yaml up -d
```

The `-d` flag runs the containers in the background. Docker will pull the required images on the first run — this may take a minute.

## Verifying it is running

```bash
docker compose -f dev-docker-compose.yaml ps
```

You should see a `postgres` service listed with a status of `running`.

## Connection details

| Field    | Value         |
|----------|---------------|
| Host     | localhost     |
| Port     | 43997         |
| Database | s_index_local |
| User     | admin         |
| Password | root          |

**Connection URI:**

```text
postgresql://admin:root@localhost:43997/s_index_local
```

## Stopping the database

```bash
docker compose -f dev-docker-compose.yaml down
```

To also delete all stored data (full reset):

```bash
docker compose -f dev-docker-compose.yaml down -v
```
