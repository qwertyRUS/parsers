# ─── СТАДИЯ 1: builder ─────────────────────────────────────────
FROM node:20.15.1-slim AS builder

WORKDIR /usr/src/app

# 1) Копируем только манифесты, ставим всё (dev + prod)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# 2) Копируем исходники и билдим esbuild
COPY . .

# ─── СТАДИЯ 2: runtime ─────────────────────────────────────────
FROM node:20.15.1-slim AS runtime

WORKDIR /usr/src/app

# 3) Ставим только prod‑зависимости
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# 4) Копируем результат сборки из builder
COPY --from=builder /usr/src/app/dist ./dist

# 5) Устанавливаем системные зависимости для Puppeteer
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libgdk-pixbuf2.0-0 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  --no-install-recommends \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# 6) Создаём папки для артефактов
RUN mkdir -p failed_captchas logs

# 7) Настройки и порт
ENV NODE_ENV=production
EXPOSE 8000

# 8) Запускаем бандл
CMD ["node", "dist/server.cjs"]
