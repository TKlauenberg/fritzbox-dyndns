# Stage 1: Build TypeScript code
FROM node:lts-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

RUN npm ci

# Copy the rest of the project files to the working directory
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Create production image
FROM node:lts-alpine

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Set the desired port (change if needed)
ENV PORT 8080
EXPOSE $PORT

# Set the command to run when the container starts
CMD ["node", "dist/webhook.js"]
