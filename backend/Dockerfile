# Use Node.js 18
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install only production deps
COPY package*.json ./
RUN npm install --production

# Copy backend source
COPY . .

# Expose Cloud Run port
EXPOSE 8080

# Start app
CMD ["node", "index.js"]
