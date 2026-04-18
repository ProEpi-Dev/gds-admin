# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_BUILD_MODE=production

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

# Copy source code
COPY . .

# Build: modo controla qual .env.* o Vite carrega (.env.production vs .env.development)
RUN echo "Building with VITE_BUILD_MODE=${VITE_BUILD_MODE}..." && \
    if [ "${VITE_BUILD_MODE}" = "production" ] && [ -f .env.production ]; then \
        echo "📄 .env.production:"; cat .env.production; \
    elif [ "${VITE_BUILD_MODE}" = "development" ] && [ -f .env.development ]; then \
        echo "📄 .env.development:"; cat .env.development; \
    else \
        echo "⚠️  Arquivo .env esperado para o modo não encontrado"; \
    fi && \
    npx tsc -b && npx vite build --mode "${VITE_BUILD_MODE}"

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (optional - for SPA routing)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
