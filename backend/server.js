dotenv.config();
import express from 'express';
import dotenv from 'dotenv';
import client from 'prom-client';
import mongoose from 'mongoose';
import router from './src/routes/parsing.routes.js';
import { initSchedulers } from './src/jobs/scheduler.js';
import { launchBot } from './src/bot/bot.js';
import { logger } from './logger.js';

const { MONGO_USER, MONGO_PASS, MONGO_DB, PORT } = process.env;
const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:27017/${MONGO_DB}?authSource=parserDB`;

const app = express();
const port = PORT || 8000;
// --- Настройка Prometheus метрик ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestCounter);

// Middleware для подсчета запросов
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.route) {
      // Считаем только запросы, у которых есть маршрут
      httpRequestCounter.inc({
        method: req.method,
        route: req.route.path,
        status_code: res.statusCode
      });
    }
  });
  next();
});

app.use(express.json());

app.use('/api/parse', router);

initSchedulers();
launchBot();
// --- Эндпоинт для Prometheus ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      logger.info(`Сервер запущен на порту ${port}`);
    });
  })
  .catch(err => {
    logger.error(`Ошибка подключения к MongoDB ${err} ${MONGO_URI}`);
    process.exit(1);
  });
