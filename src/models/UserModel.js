import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      required: false // username может быть не указан в Telegram
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: false
    },
    role: {
      type: String,
      enum: ['guest', 'admin', 'trusted', 'blacklisted'],
      default: 'guest'
    }
  },
  {
    timestamps: true // Добавляет поля createdAt и updatedAt
  }
);

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
