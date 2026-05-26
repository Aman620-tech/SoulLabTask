#!/bin/bash

# =============================================================
# Payment Gateway — Automated Setup Script
# =============================================================
# Run this script once after cloning the repo.
# It will install dependencies, start Docker services,
# run migrations, and seed demo data.
# Usage: bash setup.sh
# =============================================================

set -e  # Exit immediately if any command fails

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()    { echo -e "${GREEN}[✔] $1${NC}"; }
warn()   { echo -e "${YELLOW}[!] $1${NC}"; }
error()  { echo -e "${RED}[✘] $1${NC}"; exit 1; }

echo ""
echo "================================================="
echo "   Payment Gateway — Setup Script"
echo "================================================="
echo ""

# -------------------------------------------------------------
# Step 1: Check required tools
# -------------------------------------------------------------
log "Checking required tools..."

command -v node >/dev/null 2>&1 || error "Node.js is not installed. Install from https://nodejs.org"
command -v npm  >/dev/null 2>&1 || error "npm is not installed."
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Install from https://docker.com"
command -v docker-compose >/dev/null 2>&1 || warn "docker-compose not found — trying 'docker compose' instead"

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js >= 18 required. Current: $(node -v)"
fi

log "Node.js $(node -v) — OK"
log "npm $(npm -v) — OK"
log "Docker — OK"

# -------------------------------------------------------------
# Step 2: Create .env if it doesn't exist
# -------------------------------------------------------------
if [ ! -f ".env" ]; then
  warn ".env not found — creating from defaults..."
  cat > .env <<EOF
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d

# Payment Config
PAYMENT_LOCK_TTL=30
MAX_RETRIES=3
RETRY_BASE_DELAY_MS=1000

# Gateway Simulator
GATEWAY_TIMEOUT_MS=5000
GATEWAY_FAILURE_RATE=0.3
EOF
  log ".env created with default values"
else
  log ".env already exists — skipping"
fi

# -------------------------------------------------------------
# Step 3: Install Node dependencies
# -------------------------------------------------------------
log "Installing dependencies..."
npm install
log "Dependencies installed"

# -------------------------------------------------------------
# Step 4: Start Docker services (Postgres + Redis)
# -------------------------------------------------------------
log "Starting Docker services..."

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d
else
  docker compose up -d
fi

log "Docker services started"

# -------------------------------------------------------------
# Step 5: Wait for Postgres to be ready
# -------------------------------------------------------------
warn "Waiting for PostgreSQL to be ready..."
MAX_WAIT=30
COUNT=0

until docker exec $(docker ps -qf "name=postgres") pg_isready -U postgres >/dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge "$MAX_WAIT" ]; then
    error "PostgreSQL did not become ready in time. Check docker logs."
  fi
  sleep 1
done

log "PostgreSQL is ready"

# -------------------------------------------------------------
# Step 6: Run Sequelize migrations
# -------------------------------------------------------------
log "Running database migrations..."
npx sequelize-cli db:migrate
log "Migrations complete"

# -------------------------------------------------------------
# Step 7: Seed demo data
# -------------------------------------------------------------
log "Seeding demo users..."
npx sequelize-cli db:seed:all
log "Seed complete"

# -------------------------------------------------------------
# Done
# -------------------------------------------------------------
echo ""
echo "================================================="
echo -e "${GREEN}   Setup Complete!${NC}"
echo "================================================="
echo ""
echo "  Demo users created:"
echo "  Email:    aman@example.com"
echo "  Password: password123"
echo ""
echo "  Email:    test@example.com"
echo "  Password: password123"
echo ""
echo "  Start the server:"
echo "  $ npm run dev"
echo ""
echo "  Server will run at: http://localhost:3000"
echo "  Health check:       http://localhost:3000/health"
echo "================================================="
echo ""