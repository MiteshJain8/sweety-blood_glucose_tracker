# Sweety

A small blood glucose tracker built with React, Tailwind CSS, Express and PostgreSQL.

## Requirements and installation

- Node.js 22.12 or later and npm
- Docker with Docker Compose, with the Docker engine running

From the repository root:

```sh
npm ci
cp .env.example .env
cp server/.env.example server/.env
```

Generate a secret and paste the output into JWT_SECRET in server/.env:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

The example credentials are for local development only. If you change POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB or POSTGRES_PORT in the root .env, update server/.env's database URLs to match. Database credentials are initialized only when the Docker volume is first created.

## Database and demo account

```sh
docker compose up -d --wait
npm run db:setup
npm run db:seed
```

Demo login: **demo@sweety.example** / **SweetyDemo123!**

The seed creates sample readings for today, the current month and the previous month, using Asia/Kolkata dates. It can be rerun: matching demo slots are updated rather than duplicated, and unrelated users are preserved. It resets the demo password to the documented value. Use it only in a development/demo database. It does not delete older demo readings.

The schema script creates missing tables; it does not migrate existing table definitions. PostgreSQL persists data in a named Docker volume. `docker compose stop` preserves it; `docker compose down -v` deletes it.

## Run

In separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Open http://localhost:5173. Keep the API on port 3000, or update the proxy in client/vite.config.js. APP_ORIGIN must match the browser origin. Vite forwards /api requests to Express. http://localhost:3000/api/health checks database connectivity.

## Tests and build

Create a separate test database once:

```sh
docker compose exec db createdb -U sweety sweety_test
```

Set TEST_DATABASE_URL in server/.env to that database (the example already specifies sweety_test), then run:

```sh
npm test
npm run build
```

Tests cover authentication, cookies, password storage, CRUD validation, user isolation, report calculations, empty periods and calendar boundaries. The database suite creates its tables and removes its generated users. Never point TEST_DATABASE_URL at an application database. If sweety_test already exists, skip the createdb command.

Without PostgreSQL, run only the standalone checks:

```sh
node --test server/test/reading-validation.test.js server/test/report-ranges.test.js
```

The build produces client/dist. `npm start --workspace server` starts the API without watch mode. Production static-file hosting is not configured; the Vite proxy is development-only.

## Features and API

- Registration, login, logout and session restoration.
- Add, view, edit and delete your own readings, with up to four unique slots per day.
- Required integer values of 40–600 mg/dl, real calendar dates and no future dates.
- Daily, month-to-date and complete previous-month reports with count, minimum, maximum and average rounded to one decimal. Daily readings list their slots.
- Friendly empty states and errors; failed saves retain entered values.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/auth/register | name, email, password |
| POST | /api/auth/login | email, password |
| POST | /api/auth/logout | Clear session cookie |
| GET | /api/auth/me | Current user |
| GET | /api/readings?date=YYYY-MM-DD | Selected day's readings |
| POST | /api/readings | Create reading |
| PUT | /api/readings/:id | Update reading |
| DELETE | /api/readings/:id | Delete reading |
| GET | /api/reports?date=YYYY-MM-DD | Three report summaries |

Reading bodies contain date, slot and numeric value. Slots: morning, after_breakfast, after_lunch, after_dinner. Reports return daily, monthToDate and monthly objects with start, end, count, minimum, maximum and average. Empty summaries contain count 0 and null statistics.

## Notes

- Today uses Asia/Kolkata. The monthly report is the complete month before the selected date's month. All report boundaries are inclusive; no readings are invented for missing slots.
- The four fixed slots and UNIQUE(user_id,date,slot) constraint enforce the daily maximum, including concurrent inserts. User IDs come from verified authentication, never the request body.
- Passwords use bcrypt cost 12. Inputs must be at least eight characters and at most 72 UTF-8 bytes. Emails are trimmed and lowercased.
- Sessions use one-day HS256 JWTs in HTTP-only SameSite=Strict cookies. Secure cookies require HTTPS with NODE_ENV=production. Logout clears the cookie but does not revoke a copied token before expiry.
- PostgreSQL runs in Docker; Express and Vite run locally. No ORM, React framework, Redis, charts or background jobs are included.
- The palette uses the Kenpath colors supplied for this assignment. Dark mode is the default.
- With more time: rate limiting, account recovery, token revocation, ordered migrations, deployment configuration and more browser automation. Login timing for missing accounts could also be made more uniform.
