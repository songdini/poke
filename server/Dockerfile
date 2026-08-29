FROM node:22-alpine

WORKDIR /app

# SQLite C++ 네이티브 모듈(better-sqlite3) 빌드 도구 설치
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"] 