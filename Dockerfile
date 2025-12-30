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

# 프로덕션 스테이지 (Node.js + nginx)
FROM node:20-alpine AS production

# OpenAI API Key를 빌드 인자로 받기
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

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
COPY .env.production ./

# 환경변수 파일이 없는 경우 기본값 생성
RUN if [ ! -f .env.production ]; then \
    echo "PORT=3001" > .env.production; \
    fi

# OpenAI API Key를 환경변수 파일에 추가 (빌드 시에만 사용)
RUN if [ ! -z "$OPENAI_API_KEY" ]; then \
    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env.production; \
    fi

# 빌드된 웹 파일들 복사
COPY --from=build /app/dist /usr/share/nginx/html

# 빌드된 admin 파일들 복사
COPY --from=build /app/admin/build /usr/share/nginx/html/admin

# nginx 설정 (API 프록시 포함)
COPY nginx.conf /etc/nginx/nginx.conf

# supervisor 설정 (nginx + Node.js 동시 실행)
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]