# 멀티스테이지 빌드를 위한 베이스 이미지
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 빌드에 필요한 도구들 설치
RUN apk add --no-cache python3 make g++

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (production + server 의존성)
RUN npm cache clean --force && \
    npm install --verbose

# 빌드 스테이지
FROM node:20-alpine AS build

WORKDIR /app

# 빌드에 필요한 도구들 설치
RUN apk add --no-cache python3 make g++

# package.json과 package-lock.json 복사
COPY package*.json ./

# npm 캐시 정리 및 의존성 설치
RUN npm cache clean --force && \
    npm install --verbose

# 소스 코드 복사
COPY . .

# 프로덕션 환경변수 복사
COPY .env.production .env

# 웹 버전 빌드
RUN npm run build:web

# 프로덕션 스테이지 (Node.js + nginx)
FROM node:20-alpine AS production

# nginx와 필요한 도구들 설치
RUN apk add --no-cache nginx supervisor python3 make g++

# 작업 디렉토리 설정
WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm cache clean --force && \
    npm install --production --verbose

# 백엔드 서버 코드 복사
COPY server/ ./server/
COPY .env.production .env

# 환경변수 파일이 없는 경우 기본값 생성
RUN if [ ! -f .env ]; then echo "PORT=3001" > .env; fi

# 빌드된 웹 파일들 복사
COPY --from=build /app/dist /usr/share/nginx/html

# nginx 설정 (API 프록시 포함)
COPY nginx.conf /etc/nginx/nginx.conf

# supervisor 설정 (nginx + Node.js 동시 실행)
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]