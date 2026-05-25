FROM node:20-alpine

WORKDIR /app

# 复制 standalone 构建产物
COPY .next/standalone/package.json ./
COPY .next/standalone/package-lock.json ./
COPY .next/standalone/server.js ./
COPY .next/standalone/next.config.ts ./
COPY .next/standalone/tsconfig.json ./
COPY .next/standalone/postcss.config.mjs ./
COPY .next/standalone/eslint.config.mjs ./
COPY .next/standalone/.env ./
COPY .next/standalone/.next ./.next
COPY .next/standalone/app ./app
COPY .next/standalone/lib ./lib
COPY .next/standalone/prisma ./prisma
COPY .next/standalone/public ./public
COPY .next/standalone/node_modules ./node_modules

# 安装 prisma 生成器并生成客户端
RUN npm install prisma --save-dev && npx prisma generate

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "server.js"]
