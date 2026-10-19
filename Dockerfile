FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && chown node:node /app
COPY --chown=node:node server.mjs ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node data ./data
ENV HUNCH_DB_PATH=/app/data/hunch.sqlite
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
