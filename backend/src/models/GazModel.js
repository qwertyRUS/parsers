import mongoose from 'mongoose';

const ParseResultSchema = new mongoose.Schema(
  {
    начислено: Number,
    СуммаПерерасчетов: Number,
    Тариф: Number,
    Объем: Number,
    ОплатаПоступившая: Number,
    Период: String,
    ДатаПлатежа: String,
    Задолженность: { type: Number, required: false }
  },
  { timestamps: true }
);

const ParserModel = mongoose.model('GAZ', ParseResultSchema);

export default ParserModel;
