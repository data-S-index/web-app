# Scholar Data

**Give your datasets the credit they deserve.**

Scholar Data helps you measure, improve, and showcase the impact of what you share-beyond publications. Get credit for the data you share-clearly, fairly, and publicly.

## What Scholar Data offers

- **S-Index & D-Index** - A dataset-first impact metric. Each dataset earns a D-Index (FAIRness, citations, and mentions), and your S-Index rolls them up into one clear score you can actually explain.
- **FAIR Assessment** - See how Findable, Accessible, Interoperable, and Reusable your datasets really are, with transparent scores you can improve over time.
- **Dataset Discovery** - Find datasets by topic, DOI, or keyword. Track citations and attention over time and spot real-world reuse across the community.
- **Authors & Organizations** - Look up researchers and institutions in seconds. See S-Index scores, claimed datasets, and data-sharing footprint in one place.
- **Claim Your Datasets** - Connect DOIs and URLs to your profile and start building measurable credit for the data you publish-not just the papers.
- **Resolve & Enrich** - Turn a DOI or URL into rich dataset metadata: citations, mentions, normalization, and domain context.

### Resolver

Paste a DOI or dataset URL to get **on-demand dataset metrics**, computed in real time. The D-Index is calculated at request time so you always see the latest citations, mentions, FAIR score, and normalized results in one place.

### Why it matters

Publications aren’t the whole story-datasets drive discovery. Traditional metrics reward papers. The S-Index rewards shared datasets: how findable they are, how often they’re cited or mentioned, and how they’re reused. It’s simple to interpret, field-sensitive, and built on tools researchers already use.

- **Dataset-first** - Every dataset earns a D-Index; your S-Index reflects your full sharing footprint.
- **Fair across fields** - Context and normalization help comparisons stay meaningful across disciplines.
- **Built on reuse + FAIR** - FAIRness, citations, and attention combined into one transparent, improvable score.

## Getting started

### Prerequisites/Dependencies

You will need the following installed on your system:

- Node.js
- Yarn
- Docker
- Volta (optional)

### Setup

1. Clone the repository

   ```bash
   git clone https://github.com/data-S-index/web-app
   ```

2. Install the dependencies

   ```bash
   yarn install
   ```

3. Add your environment variables. An example is provided at `.env.example`

   ```bash
   cp .env.example .env
   ```

4. Start the development server

   ```bash
   yarn dev
   ```

5. Open the application in your browser

   ```bash
   open http://localhost:3000
   ```

## Development

### Database, Meilisearch & Redis

The application uses:

- **PostgreSQL 18** - primary database (Prisma)
- **Meilisearch** - search engine for datasets, authors, and organizations
- **Redis** - caching (resolve, metrics), rate limiting, and job state

Run all services locally with Docker:

```bash
docker-compose -f ./dev-docker-compose.yaml up
docker-compose -f ./dev-docker-compose.yaml up -d  # run in background
```

| Service     | Host port | Purpose                   |
| ----------- | --------- | ------------------------- |
| PostgreSQL  | 43997     | Database                  |
| Meilisearch | 42341     | Search (datasets, au, ao) |
| Redis       | 44001     | Cache, rate limit, jobs   |

Add to your `.env` when using the dev stack:

```bash
# Meilisearch (matches dev-docker-compose.yaml)
MEILISEARCH_API_URL=http://localhost:42341
MEILISEARCH_API_KEY=K8xP2mN9vQ5rT7wY3zA6bC1dE4fG8hJ0kL2mN5pQ8sT1vW4xZ7aB0cD3eF6gH9

# Redis (host port 44001 from docker-compose)
REDIS_HOST=localhost
REDIS_PORT=44001
```

Stop all services:

```bash
docker-compose -f ./dev-docker-compose.yaml down
```

### Prisma

The application uses Prisma to interact with the PostgreSQL database.

### UI

The application uses [Nuxt UI](https://ui.nuxt.com) to build the UI components. It also uses [Tailwind CSS](https://tailwindcss.com) for styling.
