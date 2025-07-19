import cron from 'node-cron';
import { gazService } from '../services/gazService.js';
import { elektroService } from '../services/elektroService.js';
import { fsspService } from '../services/fsspService.js';
import { sudService } from '../services/sudService.js';

const createRetryingJob = (
  schedule,
  service,
  { attempts = 3, delay = 2 * 60 * 60 * 1000 } = {}
) => {
  cron.schedule(schedule, async () => {
    for (let i = 1; i <= attempts; i++) {
      try {
        const result = await service();

        if (result) break;
      } catch (error) {
        throw error;
      }

      if (i < attempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  });
};

export const initSchedulers = () => {
  createRetryingJob('9 9 2 * 1-5', elektroService, 'ТНС-Энерго');
  createRetryingJob('9 9 5 * 1-5', elektroService, 'ТНС-Энерго');
  createRetryingJob('20 9 2 * 1-5', fsspService, 'ФССП');
  createRetryingJob('20 9 5 * 1-5', fsspService, 'ФССП');
  createRetryingJob('15 9 2 * 1-5', gazService, 'Газпром');
  createRetryingJob('15 9 5 * 1-5', gazService, 'Газпром');
  createRetryingJob('45 9 2 * 1-5', sudService, 'Мировой суд');
  createRetryingJob('45 9 5 * 1-5', sudService, 'Мировой суд');
};
