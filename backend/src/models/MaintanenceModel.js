import mongoose from 'mongoose';

const MaintanenceSchema = new mongoose.Schema(
  {
    note: String,
    taskID: Number,
    status: String,
    solution: String,
    cost: String,
    solveCount: Number,
    fileName: String
  },
  { timestamps: true }
);

const MaintanenceModel = mongoose.model('Maintanence', MaintanenceSchema);

export default MaintanenceModel;
