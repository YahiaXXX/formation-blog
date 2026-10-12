FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
# Dedicated log directory (mounted as its own volume)
RUN mkdir -p /var/log/app && chown -R node:node /var/log/app /app
USER node
ENV NODE_ENV=production LOG_DIR=/var/log/app PORT=4000
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "src/index.js"]
