# Certen demos — orchestrator
# Runs the TypeScript orchestrator directly via tsx (no compile step).
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install

# Then the source.
COPY tsconfig.json ./
COPY src ./src

EXPOSE 8770

CMD ["npx", "tsx", "src/index.ts"]
