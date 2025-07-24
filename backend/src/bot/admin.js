import { getUsersByRole, changeUserRole } from '../services/userService.js';

export const isAdmin = (ctx, next) => {
  if (ctx.dbUser?.role === 'admin') {
    return next();
  }
  return ctx.reply('⛔️ У вас нет прав для выполнения этой команды.');
};

export const registerAdminCommands = bot => {
  const listUsersHandler = async (ctx, role, title) => {
    try {
      await ctx.reply(`Ищу пользователей с ролью "${role}"... 🕵️`);
      const users = await getUsersByRole(role);

      if (!users || users.length === 0) {
        return ctx.reply(`Пользователи с ролью "${role}" не найдены.`);
      }

      let userList = `👥 Список "${title}":\n\n`;
      users.forEach((user, index) => {
        const username = user.username ? `@${user.username}` : 'N/A';
        userList += `${index + 1}. ${user.firstName} (${username}) - ID: ${user.userId}\n`;
      });

      await ctx.reply(userList);
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при получении списка пользователей.');
    }
  };

  bot.hears('👥 Гости', isAdmin, ctx => listUsersHandler(ctx, 'guest', 'Гости'));
  bot.hears('✅ Доверенные', isAdmin, ctx => listUsersHandler(ctx, 'trusted', 'Доверенные'));
  bot.hears('👑 Админы', isAdmin, ctx => listUsersHandler(ctx, 'admin', 'Администраторы'));
  bot.hears('🚫 Заблокированные', isAdmin, ctx =>
    listUsersHandler(ctx, 'blacklisted', 'Заблокированные')
  );

  const userRoleHandler = async (ctx, newRole) => {
    try {
      const parts = ctx.message.text.split(' ');
      if (parts.length < 2) {
        return ctx.reply(`Пожалуйста, укажите ID пользователя. Пример: ${parts[0]} 123456789`);
      }
      const userId = parseInt(parts[1], 10);
      if (isNaN(userId)) {
        return ctx.reply('ID пользователя должен быть числом.');
      }

      const updatedUser = await changeUserRole(userId, newRole);

      if (updatedUser) {
        await ctx.reply(
          `✅ Роль пользователя ${updatedUser.firstName} (@${
            updatedUser.username || 'N/A'
          }) изменена на "${newRole}".`
        );
      } else {
        await ctx.reply(`⚠️ Пользователь с ID ${userId} не найден.`);
      }
    } catch (error) {
      await ctx.reply('❌ Произошла ошибка при изменении роли пользователя.');
    }
  };

  bot.command('trust', isAdmin, ctx => userRoleHandler(ctx, 'trusted'));
  bot.command('ban', isAdmin, ctx => userRoleHandler(ctx, 'blacklisted'));
  bot.command('mkguest', isAdmin, ctx => userRoleHandler(ctx, 'guest'));
  bot.command('mkadmin', isAdmin, ctx => userRoleHandler(ctx, 'admin'));
};
