FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build the application with production environment (skip type checking)
RUN DISABLE_ESLINT_PLUGIN=true npm run build

# Production stage
FROM nginx:alpine

# Copy built app to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]