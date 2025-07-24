import { logger } from '../../../logger.js';
import { findOrCreateUser } from '../../services/userService.js';

export const attachUserMiddleware = async (ctx, next) => {
  if (ctx.from) {
    const user = await findOrCreateUser(ctx.from);
    logger.info('Зашол пользователь:', ctx.from);
    if (user) {
      ctx.dbUser = user;
      if (user.role === 'blacklisted') {
        return;
      }
    }
  }
  return next();
};

export const isAllowed = (ctx, next) => {
  const role = ctx.dbUser?.role;

  if (role === 'admin' || role === 'trusted') {
    return next();
  }

  if (role === 'guest') {
    return ctx.reply(
      '🔒 Эта функция доступна только для доверенных пользователей. Пожалуйста, обратитесь к администратору для получения доступа.'
    );
  }
};
