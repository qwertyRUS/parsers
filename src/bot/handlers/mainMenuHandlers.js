import { Markup } from 'telegraf';
import { getAvailableGazPeriods } from '../../services/gazService.js';
import { getAvailableElektroPeriods } from '../../services/elektroService.js';
import { isAdmin } from '../admin.js';
import { isAllowed } from '../middleware/userMiddleware.js';
import { showPeriodSelection } from '../menu.js';
import { userKeyboard, adminKeyboard, adminSubKeyboard } from '../keyboards.js';

export const registerMainMenuHandlers = bot => {
  bot.start(ctx => {
    const role = ctx.dbUser?.role;
    if (role === 'admin') {
      ctx.reply(
        'Добро пожаловать, Администратор! Вам доступны расширенные команды.',
        adminKeyboard
      );
    } else if (role === 'trusted') {
      ctx.reply(
        'Привет! Я бот для получения данных за ЖКУ из истории. Выбери нужный сервис в меню ниже:',
        userKeyboard
      );
    } else {
      ctx.reply('👋 Привет! Ваш аккаунт ожидает подтверждения администратором.');
    }
  });

  const userHelpText =
    'Используй кнопки в меню для запуска парсеров:\n\n' +
    '🔥 Газпром - запустить парсер Газпром Межрегионгаз.\n' +
    '⚡️ ТНС-Энерго - запустить парсер ТНС-Энерго.';

  const adminHelpText =
    'Вам доступны все команды пользователя, а также команды администрирования:\n\n' +
    '<b>Кнопки меню:</b>\n' +
    '👥 Гости - посмотреть список пользователей, ожидающих подтверждения.\n' +
    '✅ Доверенные - список пользователей с доступом к парсерам.\n' +
    '🚫 Заблокированные - черный список.\n' +
    '👑 Админы - список администраторов.\n\n' +
    '<b>Команды для управления ролями (вводятся вручную):</b>\n' +
    '<code>/trust ID_пользователя</code> - дать доступ\n' +
    '<code>/ban ID_пользователя</code> - заблокировать\n' +
    '<code>/mkguest ID_пользователя</code> - сделать гостем\n' +
    '<code>/mkadmin ID_пользователя</code> - сделать админом';

  bot.help(ctx => {
    const role = ctx.dbUser?.role;
    if (role === 'admin') {
      ctx.replyWithHTML(adminHelpText, adminKeyboard);
    } else if (role === 'trusted') {
      ctx.reply(userHelpText, userKeyboard);
    } else {
      ctx.reply(
        'После подтверждения вашего аккаунта администратором, вам станут доступны команды.'
      );
    }
  });

  bot.hears('⚙️ Администрирование', isAdmin, async ctx => {
    await ctx.reply('Вы вошли в меню администрирования.', adminSubKeyboard);
  });

  bot.hears('🔥 Газпром', isAllowed, async ctx => {
    try {
      ctx.session ??= {};
      if (ctx.session.lastMenuMessageId) {
        await ctx.deleteMessage(ctx.session.lastMenuMessageId).catch(() => {});
      }
      const periods = await getAvailableGazPeriods();
      const message = await showPeriodSelection(ctx, 'Газпром', periods);
      if (message) ctx.session.lastMenuMessageId = message.message_id;
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при получении списка периодов.');
    }
  });

  bot.hears('⚡️ ТНС-Энерго', isAllowed, async ctx => {
    try {
      ctx.session ??= {};
      if (ctx.session.lastMenuMessageId) {
        await ctx.deleteMessage(ctx.session.lastMenuMessageId).catch(() => {});
      }
      const periods = await getAvailableElektroPeriods();
      const message = await showPeriodSelection(ctx, 'ТНС-Энерго', periods);
      if (message) ctx.session.lastMenuMessageId = message.message_id;
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при получении списка периодов.');
    }
  });

  bot.hears('⬅️ Назад в главное меню', async ctx => {
    const role = ctx.dbUser?.role;
    if (role === 'admin') {
      await ctx.reply('Главное меню', adminKeyboard);
    } else if (role === 'trusted') {
      await ctx.reply('Главное меню', userKeyboard);
    }
  });

  bot.on('text', ctx => {
    const isCommand =
      ctx.message.entities?.[0]?.type === 'bot_command' && ctx.message.entities[0].offset === 0;

    if (isCommand) {
      return ctx.reply(
        'Такая команда не найдена. Пожалуйста, проверьте список доступных команд в /help.'
      );
    }

    const role = ctx.dbUser?.role;

    if (role === 'guest') {
      ctx.reply('👋 Ваш аккаунт ожидает подтверждения администратором.', Markup.removeKeyboard());
    } else if (role === 'admin') {
      ctx.reply('Я не знаю такой команды. Пожалуйста, используйте кнопки в меню.', adminKeyboard);
    } else if (role === 'trusted') {
      ctx.reply('Я не знаю такой команды. Пожалуйста, используйте кнопки в меню.', userKeyboard);
    }
  });
};
