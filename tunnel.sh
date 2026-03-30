#!/bin/bash
# Start Cloudflare tunnel, update _redirects, deploy to Netlify
set -e

echo "🔌 Starting tunnel..."
cloudflared tunnel --url http://localhost:4000 &
TUNNEL_PID=$!
sleep 8

# Grab the tunnel URL from cloudflared output
TUNNEL_URL=$(ps aux | grep cloudflared | grep -v grep > /dev/null && curl -s http://localhost:4000/health > /dev/null && echo "ok")
if [ "$TUNNEL_URL" != "ok" ]; then
  echo "❌ Backend not running on :4000"
  kill $TUNNEL_PID 2>/dev/null
  exit 1
fi

# Get URL from cloudflared metrics
TUNNEL_URL=$(curl -s http://localhost:20241/metrics 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | head -1)
if [ -z "$TUNNEL_URL" ]; then
  # Fallback: check recent log
  sleep 3
  TUNNEL_URL=$(log show --last 15s --predicate 'process == "cloudflared"' 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
fi

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Couldn't detect tunnel URL"
  kill $TUNNEL_PID 2>/dev/null
  exit 1
fi

echo "✅ Tunnel: $TUNNEL_URL"

# Update _redirects
cat > frontend/public/_redirects << EOF
/api/* ${TUNNEL_URL}/api/:splat 200
/* /index.html 200
EOF

echo "📦 Building frontend..."
cd frontend && npm run build 2>&1 | tail -2

echo "🚀 Deploying to bubl.buzz..."
netlify deploy --prod --dir=dist --no-build 2>&1 | grep "Production URL"

echo ""
echo "✅ bubl.buzz is live with tunnel: $TUNNEL_URL"
echo "   Tunnel PID: $TUNNEL_PID (kill $TUNNEL_PID to stop)"
