FROM node:24-alpine AS builder

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate --config prisma7.config.ts

RUN pnpm run build


FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/prisma ./prisma

COPY package.json prisma7.config.ts ./

EXPOSE 3000

CMD [ "sh", "-c", "./node_modules/.bin/prisma migrate deploy --config prisma7.config.ts && node dist/main.js" ]
