# Use Node for build + serve
FROM node:18-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Cloud Run expects port 8080
EXPOSE 8080

# Run vite preview dynamically
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
