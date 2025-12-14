# Multi-stage build for Cloud Run
# Build stage
FROM node:18 AS build
WORKDIR /app

# Set build-time environment variables
ENV VITE_BACKEND_URL=https://medplat-backend-139218747785.europe-west1.run.app
ENV VITE_API_BASE=https://medplat-backend-139218747785.europe-west1.run.app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --unsafe-perm || npm install --unsafe-perm

# Copy source and build
COPY . .
RUN npm run build

# Serve stage - use serve instead of nginx for simplicity
FROM node:18
WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy build output from build stage
COPY --from=build /app/dist ./dist

# Cloud Run uses $PORT
ENV PORT=8080
EXPOSE 8080

# Start frontend
CMD ["serve", "-s", "dist", "-l", "8080"]
