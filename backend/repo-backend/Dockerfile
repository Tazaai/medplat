# Use Node.js LTS base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Set environment variable for port used in Cloud Run
ENV PORT=8080
EXPOSE 8080

# Start the backend using npm script from package.json
CMD ["npm", "start"]
