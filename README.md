# Let's Meet

A playful, private meeting planner for two people. Create an invitation, share a private link, build a plan together, and confirm the exact version both people accepted—no accounts required.

## Highlights

- Mobile-first React interface with a soft pink visual style and animated backgrounds
- Private host and guest links with separate permissions
- Playful yes/no invitation flow
- Guided plan builder for date, exact time, duration, activities, location, mood, and notes
- Multi-select food menu, custom food ideas, restaurant details, and an optional host-cooking add-on
- Versioned plan updates so both people always accept the same proposal
- Full-plan confirmation emails sent to both participants
- Optional Web Push notifications for plan changes and confirmations
- Real names in email; optional nicknames inside the application
- Installable PWA behavior and responsive phone layouts

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite, Framer Motion, Zustand |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite locally; PostgreSQL supported in deployment |
| Email | Console preview, Gmail SMTP, or Resend |
| Notifications | Standards-based Web Push with VAPID |
| Maps | OpenStreetMap and Leaflet |

## Project structure

```text
lets-meet/
├── frontend/          React client and PWA assets
├── backend/           FastAPI application, migrations, and tests
├── docs/              Deployment notes
├── scripts/           Development and demo helpers
├── docker-compose.yml Local PostgreSQL option
└── Makefile           Common development commands
```

## Local development

Requirements:

- Python 3.10+
- Node.js 20+
- npm

Install and configure the project:

```bash
make install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
make migrate
```

Start the backend:

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

- App: <http://localhost:5173>
- API: <http://localhost:8000>
- API documentation: <http://localhost:8000/docs>

## Configuration

Copy the supplied `.env.example` files and set values locally. Real `.env` files, databases, credentials, and VAPID private keys are intentionally excluded from Git.

Important backend variables:

```text
DATABASE_URL
FRONTEND_BASE_URL
BACKEND_BASE_URL
CORS_ORIGINS
APP_SECRET
EMAIL_PROVIDER
EMAIL_FROM
SMTP_USERNAME
SMTP_APP_PASSWORD
RESEND_API_KEY
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Frontend variable:

```text
VITE_API_BASE_URL
```

For Gmail delivery, enable Google 2-Step Verification and use a dedicated App Password. Never use or commit the normal Google account password.

### Web Push

Generate a stable VAPID pair:

```bash
cd backend
.venv/bin/vapid --gen
.venv/bin/vapid --applicationServerKey --private-key private_key.pem
```

Keep the private key secret. Changing the pair invalidates existing browser subscriptions. Push notifications require HTTPS outside local development; on iPhone or iPad, install the site on the Home Screen before enabling notifications.

## Database migrations

SQLite is used by default. Apply migrations with:

```bash
cd backend
.venv/bin/alembic upgrade head
```

For PostgreSQL, set a `postgresql+psycopg://...` connection string in `DATABASE_URL` before running migrations.

## Quality checks

```bash
cd backend && .venv/bin/pytest -q
cd frontend && npm run test
cd frontend && npm run build
```

## Privacy and security

- Invitation URLs are capability links and must be treated as secrets.
- Lookup tokens are hashed in the database.
- Private routes opt out of search indexing.
- Access logs redact invitation and response URLs.
- Email events are idempotent to prevent accidental duplicate delivery.
- Never commit `.env`, database, PEM, or generated private-key files.

This is a personal project, not a hardened multi-tenant scheduling platform. Review the deployment, abuse-prevention, backup, and privacy requirements before exposing it to a larger audience.

## Deployment

The frontend and backend can be deployed separately, or served from one virtual machine. Use PostgreSQL when deploying to a platform with an ephemeral filesystem. Configure public HTTPS URLs consistently across `FRONTEND_BASE_URL`, `BACKEND_BASE_URL`, `CORS_ORIGINS`, and `VITE_API_BASE_URL`.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the deployment checklist.
