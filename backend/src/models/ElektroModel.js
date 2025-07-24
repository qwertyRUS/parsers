import mongoose from 'mongoose';

const ElektroResultSchema = new mongoose.Schema(
  {
    начислено: { type: Number, required: true },
    Показание: {
      type: String,
      default:
        'Чтоб получить данные в автоматическом режиме от АСКУЭ нужно дождаться конца месяца. Обычно приходят 25-27 числа каждого месяца.'
    },
    Период: { type: String },
    СуммаПлатежа: String,
    ДатаПлатежа: String,
    Долг: String
  },
  {
    timestamps: true,
    collection: 'elektroenergia' 
  }
);

const ElektroModel = mongoose.model('Elektro', ElektroResultSchema);

export default ElektroModel;
