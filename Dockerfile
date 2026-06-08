# 멀티스테이지 빌드를 위한 베이스 이미지
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 빌드에 필요한 도구들 설치
RUN apk add --no-cache python3 make g++

# package.json과 package-lock.json, .npmrc 복사
COPY package*.json .npmrc ./

# 의존성 설치 (production + server 의존성)
RUN npm cache clean --force && \
    npm install --verbose

# 빌드 스테이지
FROM node:20-alpine AS build

WORKDIR /app

# 빌드에 필요한 도구들 설치
RUN apk add --no-cache python3 make g++

# package.json과 package-lock.json, .npmrc 복사
COPY package*.json .npmrc ./

# npm 캐시 정리 및 의존성 설치
RUN npm cache clean --force && \
    npm install --verbose

# 소스 코드 복사
COPY . .

# 프로덕션 환경변수 복사
COPY .env.production .env

# 웹 버전 빌드
RUN npm run build:web

# Admin 패널 빌드
RUN cd admin && npm install --legacy-peer-deps && npm run build

# Merchant 대시보드 빌드 (실패해도 전체 빌드를 막지 않음)
RUN cd merchant && rm -rf node_modules && npm install --legacy-peer-deps && npm run build \
    || (echo "WARNING: Merchant build failed, using placeholder" && mkdir -p build && echo '<html><body><h1>Merchant Dashboard - Building...</h1></body></html>' > build/index.html)

# 프로덕션 스테이지 (Node.js + nginx)
FROM node:20-alpine AS production

# nginx와 필요한 도구들 설치
RUN apk add --no-cache nginx supervisor python3 make g++

# 작업 디렉토리 설정
WORKDIR /app

# 빌드 스테이지에서 이미 설치된 node_modules 복사 (프로덕션 필터링)
COPY package*.json .npmrc ./
COPY --from=build /app/node_modules ./node_modules

# 프로덕션에서 불필요한 dev dependencies 제거
RUN npm prune --production

# 백엔드 서버 코드 복사
COPY server/ ./server/

# 시크릿(.env.production)은 이미지에 굽지 않는다 — 런타임에 RPi 볼륨(/app/.env.production:ro)으로 주입.
# database.js는 상대경로 '.env.production'(=/app/.env.production)을 override:false로 읽으므로 볼륨이 제공한다.
# 볼륨이 없는 환경(로컬 단독 실행) 대비 최소 기본값만 생성.
RUN if [ ! -f .env.production ]; then \
    echo "PORT=3001" > .env.production; \
    fi

# 빌드된 웹 파일들 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 빌드된 admin 파일들 복사
COPY --from=build /app/admin/build /usr/share/nginx/html/admin

# 빌드된 merchant 파일들 복사
COPY --from=build /app/merchant/build /usr/share/nginx/html/merchant

# nginx 설정 (API 프록시 포함)
COPY nginx.conf /etc/nginx/nginx.conf

# supervisor 설정 (nginx + Node.js 동시 실행)
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]