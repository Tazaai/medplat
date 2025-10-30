# Use Node for build + serve
FROM node:18-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
# If a prebuilt `dist` directory exists (from the CI build step that baked
# VITE_API_BASE into the static assets), use it. Otherwise run the build.
RUN if [ -d "dist" ]; then \
			echo "Using prebuilt dist/ (skip npm run build)"; \
		else \
			npm run build; \
		fi

# Cloud Run expects port 8080
EXPOSE 8080

# Run vite preview dynamically
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
