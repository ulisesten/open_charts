#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  echo "[start.sh] .env no encontrado, copiando de .env.example"
  cp .env.example .env
fi

echo "[start.sh] Instalando dependencias del cliente..."
pn install

echo "[start.sh] Instalando dependencias del server..."
cd server
pn install
cd "$ROOT_DIR"

echo "[start.sh] Iniciando proxy server en background..."
cd server
node index.js &
SERVER_PID=$!
cd "$ROOT_DIR"

trap "kill $SERVER_PID 2>/dev/null || true" EXIT INT TERM

echo "[start.sh] Proxy server PID: $SERVER_PID"
echo "[start.sh] Iniciando cliente React..."
pn start
