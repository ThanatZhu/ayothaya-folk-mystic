FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY *.js ./
COPY server ./server
COPY maps/world.json ./maps/world.json
ENV NODE_ENV=production AUTH_MODE=firebase PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server/host.js"]
