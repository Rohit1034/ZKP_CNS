# ---------------------------
# Stage 1 — Build frontend
# ---------------------------
FROM node:22-bullseye AS frontend-builder
# ---------------------------
# Stage 1 — Build frontend
# ---------------------------
FROM node:22-bullseye AS frontend-builder

WORKDIR /app/frontend

# Copy everything (package.json, src, vite config, etc.)
COPY frontend/ ./

# Install and build
RUN npm ci --silent
# ---------------------------
# Stage 1 — Build frontend
# ---------------------------
FROM node:22-bullseye AS frontend-builder

WORKDIR /app/frontend

# Copy frontend sources
COPY frontend/ ./

# Install and build
RUN npm ci --silent
RUN npm run build

# ---------------------------
# Stage 2 — Final image
# ---------------------------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install required system packages: nginx, supervisor and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    build-essential \
    ca-certificates \
    wget \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Create app dirs
WORKDIR /app/backend
RUN mkdir -p /var/www/html

# Copy backend sources
COPY backend/ /app/backend/

# Copy built frontend into nginx webroot
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Install Python deps (explicitly list to avoid malformed repo requirements)
RUN pip install --no-cache-dir python-dotenv flask pymongo dnspython flask-cors pycryptodome psutil "ecdsa>=0.18.0" gunicorn || true

# Configure nginx to serve the SPA and proxy API calls to Gunicorn (backend)
RUN rm /etc/nginx/sites-enabled/default || true
RUN printf '%s\n' \
'server {' \
'    listen 80;' \
'    server_name _;' \
'' \
'    root /var/www/html;' \
'    index index.html index.htm;' \
'' \
'    # Serve static files and fallback to index.html for the SPA (client-side routing)' \
'    location / {' \
'        try_files $uri $uri/ /index.html;' \
'    }' \
'' \
'    # Proxy API requests to the Flask backend (Gunicorn)' \
'    location /auth/ {' \
'        proxy_pass http://127.0.0.1:5000/auth/;' \
'        proxy_set_header Host $host;' \
'        proxy_set_header X-Real-IP $remote_addr;' \
'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto $scheme;' \
'    }' \
'' \
'    location /vault/ {' \
'        proxy_pass http://127.0.0.1:5000/vault/;' \
'        proxy_set_header Host $host;' \
'        proxy_set_header X-Real-IP $remote_addr;' \
'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto $scheme;' \
'    }' \
'' \
'    # Optionally proxy other API prefixes' \
'    location /api/ {' \
'        proxy_pass http://127.0.0.1:5000/;' \
'        proxy_set_header Host $host;' \
'        proxy_set_header X-Real-IP $remote_addr;' \
'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto $scheme;' \
'    }' \
'}' \
> /etc/nginx/sites-available/zkp_cns.conf

RUN ln -s /etc/nginx/sites-available/zkp_cns.conf /etc/nginx/sites-enabled/zkp_cns.conf

# Supervisor config to run nginx + gunicorn
RUN mkdir -p /etc/supervisor/conf.d && \
    cat > /etc/supervisor/conf.d/zkp_cns.conf <<'EOF'
[supervisord]
nodaemon=true

[program:nginx]
command=/usr/sbin/nginx -g 'daemon off;'
stdout_logfile=/dev/fd/1
stderr_logfile=/dev/fd/2
numprocs=1
autostart=true
autorestart=true

[program:gunicorn]
command=/usr/local/bin/gunicorn --bind 127.0.0.1:5000 app:app --workers 3 --timeout 60
directory=/app/backend
stdout_logfile=/dev/fd/1
stderr_logfile=/dev/fd/2
autostart=true
autorestart=true
EOF

# Expose port 80 (nginx) — backend is internal on 5000
EXPOSE 80

# Default env examples (set at run time)
ENV FLASK_ENV=production
ENV MONGO_URI=mongodb+srv://heet:heet@cluster0.txa2kuw.mongodb.net

# Entrypoint: start supervisord which runs nginx + gunicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/zkp_cns.conf"]