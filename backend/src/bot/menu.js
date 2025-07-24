import { Markup } from 'telegraf';
import { logger } from '../../logger.js';

export const showPeriodSelection = async (ctx, serviceName, periods, isEdit = false) => {
  if (!periods || periods.length === 0) {
    return ctx.reply(
      `Данные для "${serviceName}" еще не были собраны. Парсинг запускается по расписанию.`
    );
  }

  const prefix = serviceName === 'Газпром' ? 'gaz' : 'elektro';

  const periodButtons = periods.map(period =>
    Markup.button.callback(period, `${prefix}_period_${period}`)
  );

  const keyboardRows = [];
  for (let i = 0; i < periodButtons.length; i += 3) {
    keyboardRows.push(periodButtons.slice(i, i + 3));
  }

  keyboardRows.push([Markup.button.callback('⬅️ Назад в главное меню', 'back_to_main_inline')]);
  const inlineKeyboard = Markup.inlineKeyboard(keyboardRows);

  const messageText = `Выберите период для просмотра данных по "${serviceName}":`;

  if (isEdit) {
    try {
      await ctx.editMessageText(messageText, inlineKeyboard);
    } catch (e) {
      if (!e.message?.includes('message is not modified')) {
        logger.error('Ошибка при редактировании сообщения:', e);
      }
    }
  } else {
    return ctx.reply(messageText, inlineKeyboard);
  }
};
