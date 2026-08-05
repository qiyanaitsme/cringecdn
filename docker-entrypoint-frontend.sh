#!/bin/bash
set -e

echo "========================================="
echo "  ImageHost Frontend Setup"
echo "========================================="

# Wait for backend
echo "Waiting for backend API..."
for i in {1..30}; do
  if curl -s -f http://backend:5000/api/health 2>/dev/null; then
    echo "Backend is ready!"
    break
  fi
  echo "Backend not ready, waiting..."
  sleep 2
done

# Set default env vars if not provided
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:5000/api}

echo "Frontend configured with:"
echo "  API URL: $NEXT_PUBLIC_API_URL"

exec "$@"