FROM node:22-bookworm-slim

# python3/make/g++ нужны для сборки нативного модуля better-sqlite3
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# npm ci требует ту же версию npm, что генерировала package-lock.json (npm 11.x, см. package.json engines)
RUN npm install -g npm@11

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
