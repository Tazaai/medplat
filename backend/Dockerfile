# Use Node.js 18
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install only production deps
# --unsafe-perm allows npm to run as root (required for Cloud Build)
COPY package.json package-lock.json ./
RUN npm ci --production --unsafe-perm || npm install --production --unsafe-perm

# Copy backend source
COPY . .

# Expose Cloud Run port
EXPOSE 8080

# Start app
CMD ["node", "index.js"]
