# S-Index

As data sharing practices continue to gain traction, the research community still lacks a standardized, transparent, and equitable method for evaluating and incentivizing data sharing. To address this gap, we propose the S-index, a novel metric that evaluates the data sharing impact of a researcher by using a unified dataset-level metric that incorporates FAIRness, citations, and alternative mentions. Addressing limitations of existing metrics, our S-index is designed to be simple to interpret, field-sensitive, responsive to evolving data sharing and reuse practices, and feasible to implement using existing tools and resources.

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

### Database

The application uses a PostgreSQL 18 database for storing data. You can use Docker to run these services locally.

```bash
docker-compose -f ./dev-docker-compose.yaml up
docker-compose -f ./dev-docker-compose.yaml up -d # if you want the db to run in the background
```

Close the database with:

```bash
docker-compose -f ./dev-docker-compose.yaml down
```

### Prisma

The application uses Prisma to interact with the database.

### UI

The application uses [Nuxt UI](https://ui.nuxt.com) to build the UI components. It also uses [Tailwind CSS](https://tailwindcss.com) for styling.
