FROM node:20-slim AS base

# Install Python3, pip, curl, ffmpeg, and yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    ffmpeg \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip
RUN python3 -m pip install --no-cache-dir --break-system-packages yt-dlp

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files
COPY . .

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start"]
