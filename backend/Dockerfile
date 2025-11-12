# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy Prisma schema and config first (for better caching)
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client (DATABASE_URL is required by prisma.config.ts but not used for generation)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate

# Copy rest of source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production

# Copy Prisma files and config
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Generate Prisma Client for production (DATABASE_URL is required by prisma.config.ts but not used for generation)
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
RUN yarn prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]

