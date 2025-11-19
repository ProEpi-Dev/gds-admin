# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

# Copy source code
COPY . .

# Build the application
# O Vite irá usar automaticamente o arquivo .env.production se existir
RUN echo "Building application..." && \
    if [ -f .env.production ]; then \
        echo "📄 Using .env.production:"; \
        cat .env.production; \
    else \
        echo "⚠️  No .env.production found, using default configuration"; \
    fi && \
    if [ -f yarn.lock ]; then yarn build; \
    else npm run build; fi

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

