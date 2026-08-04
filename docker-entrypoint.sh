#!/bin/bash
set -e

echo "========================================="
echo "  ImageHost Setup Script"
echo "========================================="

# Get IP address
echo ""
read -p "Enter the IP address for this server (press Enter for auto-detect): " SERVER_IP

if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
  echo "Auto-detected IP: $SERVER_IP"
fi

echo ""
read -p "Enter the domain name (press Enter for localhost): " DOMAIN

if [ -z "$DOMAIN" ]; then
  DOMAIN="localhost"
fi

echo ""
echo "Setting up ImageHost with:"
echo "  IP: $SERVER_IP"
echo "  Domain: $DOMAIN"
echo ""

# Generate secrets if not provided
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "default-secret-change-me")
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
  JWT_REFRESH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "default-refresh-secret-change-me")
fi

if [ -z "$POSTGRES_PASSWORD" ]; then
  POSTGRES_PASSWORD="postgres_password_change_me"
fi

# Create .env file for the container
cat > /app/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/imagehost
REDIS_URL=redis://redis:6379
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
UPLOAD_PATH=/app/uploads
UPLOAD_MAX_SIZE=20971520
UPLOAD_ALLOWED_FORMATS=jpg,jpeg,png,gif,webp
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
BRUTEFORCE_MAX_ATTEMPTS=5
BRUTEFORCE_WINDOW_MS=900000
REGISTRATION_ENABLED=false
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:5000/api
NEXT_PUBLIC_NGINX_URL=http://${SERVER_IP}
EOF

echo "Environment variables configured"

# Wait for database
echo "Waiting for database..."
for i in {1..30}; do
  if pg_isready -h db -U postgres 2>/dev/null; then
    echo "Database is ready!"
    break
  fi
  echo "Database not ready, waiting..."
  sleep 1
done

# Run prisma generate if needed
if [ -d "/app/prisma" ]; then
  cd /app
  if command -v npx &> /dev/null; then
    echo "Generating Prisma client..."
    npx prisma generate || true
    echo "Running migrations..."
    npx prisma migrate deploy || npx prisma db push || true
    echo "Seeding database..."
    npx tsx prisma/seed.ts 2>/dev/null || npx tsx prisma/seed.js 2>/dev/null || echo "Seed skipped"
  fi
fi

echo ""
echo "========================================="
echo "  Setup Complete!"
echo "========================================="
echo ""
echo "Access the application at: http://${DOMAIN}:3000"
echo "API endpoint: http://${DOMAIN}:5000/api"
echo ""
echo "Default admin credentials:"
echo "  Email: admin@imagehost.local"
echo "  Password: Admin123!@#"
echo ""

exec "$@"