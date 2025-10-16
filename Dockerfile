# 멀티스테이지 빌드를 위한 베이스 이미지
FROM node:20-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 빌드 스테이지
FROM node:20-alpine AS build

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 모든 의존성 설치 (devDependencies 포함)
RUN npm ci

# 소스 코드 복사
COPY . .

# 프로덕션 환경변수 복사
COPY .env.production .env

# 웹 버전 빌드
RUN npm run build:web

# 프로덕션 스테이지
FROM nginx:alpine AS production

# 빌드된 파일들 복사
COPY --from=build /app/dist /usr/share/nginx/html

# nginx 설정
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    
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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]