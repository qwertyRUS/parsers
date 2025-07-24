import { Markup } from 'telegraf';

export const userKeyboard = Markup.keyboard([['🔥 Газпром', '⚡️ ТНС-Энерго'], ['/help']])
  .resize()
  .persistent();

export const adminKeyboard = Markup.keyboard([
  ['🔥 Газпром', '⚡️ ТНС-Энерго'],
  ['⚙️ Администрирование'],
  ['/help']
])
  .resize()
  .persistent();

export const adminSubKeyboard = Markup.keyboard([
  ['👥 Гости', '✅ Доверенные'],
  ['🚫 Заблокированные', '👑 Админы'],
  ['⬅️ Назад в главное меню']
])
  .resize()
  .persistent();
