# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies (Prisma engines require openssl)
RUN apk add --no-cache openssl && \
    yarn install --frozen-lockfile

# Copy Prisma schema and config first (for better caching)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client (DATABASE_URL is required by prisma.config.ts but not used for generation)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate

# Copy rest of source code
COPY . .

# Build the application
RUN yarn build || (echo "Build command failed" && exit 1)

# Verify build output exists
RUN echo "Checking build output..." && \
    ls -la /app/ && \
    ls -la /app/dist/ || (echo "ERROR: dist directory not found after build" && exit 1) && \
    ls -la /app/dist/src/ || (echo "ERROR: dist/src directory not found after build" && exit 1) && \
    test -f /app/dist/src/main.js || (echo "ERROR: main.js not found in dist/src" && ls -la /app/dist/src/ && exit 1) && \
    echo "Build verification successful - dist/src/main.js found"

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies (Prisma engines require openssl)
RUN apk add --no-cache openssl && \
    yarn install --frozen-lockfile --production

# Copy Prisma files and config
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client for production (DATABASE_URL is required by prisma.config.ts but not used for generation)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Verify dist was copied and show contents
RUN echo "Verifying copied files..." && \
    ls -la /app/ && \
    ls -la /app/dist/ || (echo "ERROR: dist directory not found after copy" && exit 1) && \
    ls -la /app/dist/src/ || (echo "ERROR: dist/src directory not found after copy" && exit 1) && \
    test -f /app/dist/src/main.js || (echo "ERROR: main.js not found after copy" && ls -la /app/dist/src/ && exit 1) && \
    echo "Copy verification successful - dist/src/main.js found"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]

