import mongoose from 'mongoose';

const FsspSchema = new mongoose.Schema(
  {
    Должник: String,
    ПроизводствоНомер: String,
    РеквизитыИспДокумента: String,
    ДатаПричинаОкИП: String,
    СуммаДолга: String,
    ОтделСудПрист: String,
    Пристав: String
  },
  { timestamps: true }
);

const FsspModel = mongoose.model('Fssp', FsspSchema);

export default FsspModel;
