# Use Node.js official image
FROM node:20

# Set working directory
WORKDIR /app

# Install dependencies
RUN npm install -g next
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose port 3000 for the frontend
EXPOSE 3000

# Command to run the frontend (React app in development mode)
CMD ["npm", "run", "dev"]