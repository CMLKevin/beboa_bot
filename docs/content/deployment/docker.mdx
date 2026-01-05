# Docker Deployment

Deploy Beboa using Docker for containerized hosting.

## Prerequisites

- Docker installed
- Docker Compose (optional but recommended)
- Environment variables ready

## Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache sqlite

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Set environment
ENV NODE_ENV=production

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S beboa -u 1001 -G nodejs && \
    chown -R beboa:nodejs /app

USER beboa

CMD ["node", "src/index.js"]
```

## Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  beboa:
    build: .
    container_name: beboa-bot
    restart: unless-stopped
    volumes:
      - beboa-data:/app/data
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  beboa-data:
```

## Building and Running

### With Docker Compose (Recommended)

```bash
# Build and start
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Restart
docker compose restart
```

### With Docker Only

```bash
# Build image
docker build -t beboa-bot .

# Create volume for data
docker volume create beboa-data

# Run container
docker run -d \
  --name beboa-bot \
  --restart unless-stopped \
  -v beboa-data:/app/data \
  --env-file .env \
  beboa-bot

# View logs
docker logs -f beboa-bot
```

## Environment Variables

### Using .env File

Create `.env` in project root (not committed to git):

```env
DISCORD_TOKEN=your_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
CHECKIN_CHANNEL_ID=your_channel
NOTIFICATION_CHANNEL_ID=your_channel
ADMIN_ROLE_ID=your_role
OPENROUTER_API_KEY=your_key
BEBE_USER_ID=your_id

OPENROUTER_MODEL=deepseek/deepseek-chat
CHAT_ENABLED=true
MEMORY_ENABLED=true
```

### Using Docker Secrets (Production)

```yaml
# docker-compose.yml
version: '3.8'

services:
  beboa:
    build: .
    secrets:
      - discord_token
      - openrouter_key
    environment:
      - DISCORD_TOKEN_FILE=/run/secrets/discord_token
      - OPENROUTER_API_KEY_FILE=/run/secrets/openrouter_key

secrets:
  discord_token:
    file: ./secrets/discord_token.txt
  openrouter_key:
    file: ./secrets/openrouter_key.txt
```

## Multi-Stage Considerations

### Development vs Production

```yaml
# docker-compose.yml
version: '3.8'

services:
  beboa:
    build:
      context: .
      target: ${BUILD_TARGET:-production}
    volumes:
      - beboa-data:/app/data
      # Dev only: mount source for hot reload
      - ${DEV_MOUNT:-/dev/null}:/app/src:ro

volumes:
  beboa-data:
```

### Development Docker Compose Override

Create `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  beboa:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

## Health Checks

Add health check to Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

Or in docker-compose:

```yaml
services:
  beboa:
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('healthy')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## Updating

### Rebuild and Restart

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### Zero-Downtime Update (Advanced)

```bash
# Build new image
docker compose build

# Scale up new container
docker compose up -d --scale beboa=2 --no-recreate

# Wait for new container to be healthy
sleep 30

# Remove old container
docker compose up -d --scale beboa=1
```

## Backup and Restore

### Backup Data Volume

```bash
# Backup
docker run --rm \
  -v beboa-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/beboa-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore
docker run --rm \
  -v beboa-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/beboa-backup-20240115.tar.gz -C /data
```

### Automated Backup

Create `backup-cron.sh`:

```bash
#!/bin/bash
docker run --rm \
  -v beboa-data:/data \
  -v /backups:/backup \
  alpine tar czf /backup/beboa-$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Keep only last 7 days
find /backups -name "beboa-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
0 0 * * * /path/to/backup-cron.sh
```

## Resource Limits

```yaml
# docker-compose.yml
services:
  beboa:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Logging

### View Logs

```bash
# All logs
docker compose logs

# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100
```

### Log Rotation

Already configured in docker-compose.yml:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs beboa

# Check container status
docker ps -a

# Inspect container
docker inspect beboa-bot
```

### Volume Issues

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect beboa-data

# Remove and recreate (WARNING: deletes data)
docker compose down -v
docker compose up -d
```

### Permission Issues

```bash
# Fix volume permissions
docker run --rm \
  -v beboa-data:/data \
  alpine chown -R 1001:1001 /data
```

### Network Issues

```bash
# Check network
docker network ls
docker network inspect beboa_default
```

## Cloud Deployment

### AWS ECS

```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag beboa-bot:latest <account>.dkr.ecr.<region>.amazonaws.com/beboa:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/beboa:latest
```

### Google Cloud Run

```bash
# Push to GCR
gcloud auth configure-docker
docker tag beboa-bot gcr.io/<project>/beboa
docker push gcr.io/<project>/beboa

# Deploy
gcloud run deploy beboa --image gcr.io/<project>/beboa
```

### DigitalOcean App Platform

1. Push image to registry
2. Create App in DigitalOcean
3. Select Docker image
4. Configure environment variables
5. Deploy
