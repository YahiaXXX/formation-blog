# Blog platform (Docker)

| Service | Tech | URL |
|---|---|---|
| web   | Next.js (users: read, sign up, write posts; its API routes call the backend) | http://localhost:3000 |
| admin | React + Vite, static, nginx (moderation dashboard) | http://localhost:8080 |
| backend | Express + JWT | http://localhost:4000 (internal: backend:4000) |
| mysql | MySQL 8.4 | internal only |

## Run
    cp .env.example .env        # then edit all passwords / JWT_SECRET
    docker compose up -d --build
    docker compose ps

Admin login = ADMIN_EMAIL / ADMIN_PASSWORD from .env (created automatically on first start).

Flow: user signs up and writes a post (status `pending`) -> admin publishes/rejects it in the dashboard -> published posts show on the user site.

## Separate logs
Each service has its own container output AND its own log volume:

    # Database logs (files in volume mysql_logs)
    docker compose exec mysql tail -f /var/log/mysql/error.log
    docker compose exec mysql tail -f /var/log/mysql/slow.log
    docker compose exec mysql tail -f /var/log/mysql/general.log     # every query (dev only)

    # Backend logs (file in volume backend_logs, JSON lines)
    docker compose exec backend tail -f /var/log/app/backend.log
    docker compose logs -f backend

    # Copy logs to the host
    docker cp blog-mysql:/var/log/mysql ./logs-mysql
    docker cp blog-backend:/var/log/app ./logs-backend

MySQL writes ONLY to /var/log/mysql; the backend writes ONLY to /var/log/app.

## Useful
    docker compose down            # stop (keeps data and logs)
    docker compose down -v         # stop and DELETE database + logs
    docker compose build --no-cache web
