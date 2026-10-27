FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY *.js ./
COPY server ./server
COPY maps/world.json ./maps/world.json
# The authoritative role engine shares only pure definitions/timing with the browser.
COPY assets/skills-next/catalog.js assets/skills-next/icon-regions.js assets/skills-next/icon-renderer.js assets/skills-next/rework-icon-map.js assets/skills-next/catalog-legacy.js ./assets/skills-next/
COPY assets/skill-polish/library-profiles.js assets/skill-polish/timing.js ./assets/skill-polish/
ENV NODE_ENV=production AUTH_MODE=firebase PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server/host.js"]
