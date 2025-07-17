import UserModel from '../models/UserModel.js';

export const findOrCreateUser = async tgUser => {
  if (!tgUser) return null;

  try {
    let user = await UserModel.findOne({ userId: tgUser.id });

    if (!user) {
      const role = tgUser.userId === process.env.ADMIN_ID ? 'admin' : 'guest';

      user = await UserModel.create({
        userId: tgUser.id,
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        role: role
      });
    }
    return user;
  } catch (error) {
    if (error.code === 11000) {
      return UserModel.findOne({ userId: tgUser.id });
    }
    return null;
  }
};

export const getUsersByRole = async role => {
  return UserModel.find({ role }).lean();
};

export const changeUserRole = async (userId, newRole) => {
  return UserModel.findOneAndUpdate({ userId }, { $set: { role: newRole } }, { new: true });
};
