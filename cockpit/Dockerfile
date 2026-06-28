# Certen demos — cockpit (Vite SPA)
# Builds the SPA and serves it with `vite preview`.
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching.
COPY package.json ./
RUN npm install

# Then the source + build.
COPY . .
RUN npm run build

EXPOSE 3001

# `--host` binds 0.0.0.0 so the port is reachable from outside the container.
CMD ["npx", "vite", "preview", "--host", "--port", "3001"]
