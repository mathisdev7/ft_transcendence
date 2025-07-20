FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies and TypeScript globally
RUN npm install && npm install -g typescript ts-node

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S auth -u 1001

# Change ownership
RUN chown -R auth:nodejs /app
USER auth

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["ts-node", "index.ts"]
