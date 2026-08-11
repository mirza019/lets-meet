# Deployment

## Frontend

Import `frontend/` into Vercel or Cloudflare Pages. Build with `npm run build`, publish `dist`, and set `VITE_API_BASE_URL` to the HTTPS backend URL. Configure SPA rewrites to `index.html`.

## Backend and database

Deploy `backend/` to any Docker-capable Python host with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. A Supabase free PostgreSQL connection string works as `DATABASE_URL`; use the session-pooler URL if the host is IPv4-only. Run `alembic upgrade head` once per release.

Set a unique, stable `APP_SECRET`; changing it invalidates encrypted email-delivery handles. Set `CORS_ORIGINS` to the exact frontend origin, `FRONTEND_BASE_URL` to the public frontend, `EMAIL_PROVIDER=resend`, and the Resend settings. HTTPS is terminated by the hosting platform. The backend is portable to Render/Railway-style services and can later be moved to Supabase functions without changing the data model.

For phone push, also deploy a stable VAPID private key as a secret or mounted file and set `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, and `VAPID_SUBJECT`. The frontend must be served over HTTPS. iPhone/iPad users must add the site to the Home Screen before enabling notifications.
