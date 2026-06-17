# ============================================
# STAGE 1: Build Stage
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install ALL deps (including devDeps like typescript)
RUN npm ci

COPY . .

# Compile TypeScript → dist/
RUN npm run build

# ============================================
# STAGE 2: Production Stage
# ============================================
FROM node:20-alpine

WORKDIR /app

# tini is a proper init process — handles signals and zombie processes
RUN apk add --no-cache tini

COPY package*.json ./

# Only production deps in the final image
RUN npm ci --only=production

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Create logs directory owned by non-root user
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Never run containers as root
USER node

EXPOSE 3000

# Calls /health every 30s — if it fails 3x, container is marked unhealthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# tini as PID 1 → properly forwards SIGTERM to node for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "-r", "dist/instrument.js", "dist/app.js"]
