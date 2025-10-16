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

# 서버 코드 복사
COPY server/ ./server/
COPY .env.production .env

# 빌드된 웹 파일들 복사
COPY --from=build /app/dist /usr/share/nginx/html

# nginx 설정 (API 프록시 포함)
RUN mkdir -p /etc/nginx/conf.d
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    
    # API 요청을 Express 서버로 프록시
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 정적 파일 서빙
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
    
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# supervisor 설정 (nginx + Node.js 동시 실행)
COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
priority=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:api]
command=node server/index.js
directory=/app
autostart=true
autorestart=true
priority=20
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
environment=NODE_ENV=production,API_PORT=3001
EOF

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]