FROM node:22-slim

WORKDIR /app

# SQLite C++ 네이티브 모듈(better-sqlite3) 빌드 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"] 