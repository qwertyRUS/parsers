import { Markup } from 'telegraf';
import { getAvailableGazPeriods, getGazDataByPeriod } from '../../services/gazService.js';
import {
  getAvailableElektroPeriods,
  getElektroDataByPeriod
} from '../../services/elektroService.js';
import { formatGazData, formatElektroData } from '../formatters.js';
import { showPeriodSelection } from '../menu.js';
import { logger } from '../../../logger.js';

export const registerActionHandlers = bot => {
  bot.action(/^(gaz|elektro)_period_(.+)$/, async ctx => {
    await ctx.answerCbQuery();
    const serviceType = ctx.match[1];
    const period = ctx.match[2];

    try {
      let data;
      let formattedMessage;

      if (serviceType === 'gaz') {
        data = await getGazDataByPeriod(period);
        formattedMessage = data ? formatGazData(data) : `Не найдено данных по газу за ${period}.`;
      } else {
        data = await getElektroDataByPeriod(period);
        formattedMessage = data
          ? formatElektroData(data)
          : `Не найдено данных по электроэнергии за ${period}.`;
      }

      const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('⬅️ Назад к выбору периода', `back_to_periods_${serviceType}`)
      ]);

      try {
        await ctx.editMessageText(formattedMessage, { parse_mode: 'Markdown', ...keyboard });
      } catch (e) {
        logger.error(e);
      }
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при получении данных.');
    }
  });

  bot.action(/^back_to_periods_(gaz|elektro)$/, async ctx => {
    await ctx.answerCbQuery();
    const serviceType = ctx.match[1];

    if (serviceType === 'gaz') {
      const periods = await getAvailableGazPeriods();
      await showPeriodSelection(ctx, 'Газпром', periods, true);
    } else {
      const periods = await getAvailableElektroPeriods();
      await showPeriodSelection(ctx, 'ТНС-Энерго', periods, true);
    }
  });

  bot.action('back_to_main_inline', async ctx => {
    await ctx.answerCbQuery();
    ctx.session ??= {};
    await ctx.deleteMessage().catch(() => {});
    ctx.session.lastMenuMessageId = null;
  });
};
