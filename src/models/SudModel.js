import mongoose from 'mongoose';

const ParseSudSchema = new mongoose.Schema(
  {
    НомерДела: String,
    ДатаПоступления: String,
    ИнформацияПоДелу: String,
    Судья: String,
    ДатаРешения: String,
    Решение: String
  },
  { timestamps: true }
);
const ParserModel = mongoose.model('sud', ParseSudSchema);

export default ParserModel;
