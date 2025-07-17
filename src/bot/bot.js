import 'dotenv/config';
import { Telegraf, session } from 'telegraf';
import { registerAdminCommands } from './admin.js';
import { attachUserMiddleware } from './middleware/userMiddleware.js';
import { registerActionHandlers } from './handlers/actionHandlers.js';
import { registerMainMenuHandlers } from './handlers/mainMenuHandlers.js';
import { logger } from '../../logger.js';

const token = process.env.BOT_TOKEN;

if (!token) throw new Error('BOT_TOKEN должен быть указан в .env файле!');

const bot = new Telegraf(token);

bot.use(session());
bot.use(attachUserMiddleware);
bot.catch((err, ctx) => {
  logger.error(`Ошибка во время обработки обновления ${ctx.updateType}:`, err);
});
registerAdminCommands(bot);
registerMainMenuHandlers(bot);
registerActionHandlers(bot);

export const launchBot = async () => {
  try {
    await bot.launch();
    logger.info('Телеграм-бот успешно запущен...');
  } catch (error) {
    logger.error('Критическая ошибка при запуске Телеграм-бота:', error);
    logger.error('Бот не будет запущен. Проверьте токен и интернет-соединение.');
  }
};
