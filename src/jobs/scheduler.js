import cron from 'node-cron';
import { gazService } from '../services/gazService.js';
import { elektroService } from '../services/elektroService.js';

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
  // createRetryingJob('* 12 14 * *', elektroService, 'ТНС-Энерго');
  // createRetryingJob('5 14 14 * *', gazService, 'Газпром');
};
