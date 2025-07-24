import winston from 'winston';
import LokiTransport from 'winston-loki';
import { LOKI_HOST } from './src/config/constants.js';

const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    new winston.transports.File({ filename: 'app.log' }),
    new LokiTransport({
      host: LOKI_HOST,
      labels: { app: 'parser-service' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: err => console.error('Loki connection error:', err)
    })
  ]
});
