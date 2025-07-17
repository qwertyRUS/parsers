dotenv.config();
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import router from './src/routes/parsing.routes.js';
import { initSchedulers } from './src/jobs/scheduler.js';
import { launchBot } from './src/bot/bot.js';
import { logger } from './logger.js';

const { MONGO_USER, MONGO_PASS, MONGO_DB, PORT } = process.env;
const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@localhost:27017/${MONGO_DB}?authSource=parserDB`;

const app = express();
const port = PORT || 8000;

app.use(express.json());

app.use('/api/parse', router);

initSchedulers();
launchBot(); 

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.info(`Сервер запущен на порту ${port}`);
    });
  })
  .catch(err => {
    logger.error(`Ошибка подключения к MongoDB ${err} ${MONGO_URI}`);
    process.exit(1);
  });
