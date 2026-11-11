# Sweety

A blood glucose tracker built with React, Tailwind CSS, Express and PostgreSQL.

## Requirements

- Node.js 22.12 or later and npm
- Docker with Docker Compose

## Local setup

Run these commands from the repository root:

```sh
npm install
cp .env.example .env
cp server/.env.example server/.env
docker compose up -d --wait
npm run db:setup
```

The example database credentials are for local development. If you change the root `.env`, update `DATABASE_URL` in `server/.env` to match. Database credentials are applied when Docker creates the database volume for the first time.

Run the API and client in separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Open the URL printed by Vite (normally http://localhost:5173). Vite proxies `/api` requests to http://localhost:3000. Keep the API on port 3000 or update the proxy in `client/vite.config.js`.

Check API and database connectivity at http://localhost:3000/api/health.

## Build

```sh
npm run build
```

The frontend output is written to `client/dist`. The API can also run with `npm start --workspace server`.

## Database

`database/schema.sql` creates users and readings. Run `npm run db:setup` to apply it; it can be rerun without deleting data. Each user can have one reading per date and slot, with an integer value from 40 to 600 mg/dl.

```sh
docker compose stop
```

This stops PostgreSQL while preserving the data volume.

## Current status

Project foundation only. Authentication, reading management, reports, demo seed and automated tests are still to be implemented.

## Notes

- The application will use Asia/Kolkata to determine today's date.
- The previous-month report is relative to the selected date, rather than the current date.
- PostgreSQL runs in Docker; the API and frontend run locally.
