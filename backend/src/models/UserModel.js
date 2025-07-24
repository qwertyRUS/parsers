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
      required: false
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
    timestamps: true
  }
);

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
