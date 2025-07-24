import { logger } from '../../logger.js';
import UserModel from '../models/UserModel.js';

export const findOrCreateUser = async tgUser => {
  if (!tgUser) return null;
  const { id, first_name, last_name, username } = tgUser;
  try {
    const user = await UserModel.findOne({ userId: id });
    if (!user) {
      throw new Error.message('Пользователь не найден');
    }
    return user;
  } catch (error) {
    console.info(id, process.env.ADMIN_ID);
    const role = id === Number(process.env.ADMIN_ID) ? 'admin' : 'guest';
    const newUser = {
      userId: id,
      firstName: first_name,
      lastName: last_name,
      username: username,
      role: role
    };
    const createdUser = await UserModel.create(newUser);
    logger.info(
      `✅ Пользователь ${createdUser.username || createdUser.firstName} создан с ролью "${
        createdUser.role
      }"`
    );
    return createdUser;
  }
};

export const getUsersByRole = async role => {
  return UserModel.find({ role }).lean();
};

export const changeUserRole = async (userId, newRole) => {
  return UserModel.findOneAndUpdate({ userId }, { $set: { role: newRole } }, { new: true });
};
