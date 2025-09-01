# ~/medplat/frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# ✅ Replace default nginx.conf with dynamic PORT support
RUN rm /etc/nginx/conf.d/default.conf
RUN echo "server { \
    listen       \$PORT; \
    server_name  _; \
    root   /usr/share/nginx/html; \
    index  index.html; \
    location / { \
      try_files \$uri /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
