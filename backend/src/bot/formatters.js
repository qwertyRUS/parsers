export const formatGazData = data => {
  const { Период, начислено, Объем, ОплатаПоступившая, ДатаПлатежа } = data;
  const [month, year] = Период.split('.');
  const periodDate = new Date(`20${year}`, month - 1);
  const periodString = periodDate.toLocaleString('ru', { month: 'long', year: 'numeric' });

  let message = `📊 *Данные по Газу за ${periodString}*\n\n`;
  message += `*Начислено:* \`${начислено?.toFixed(2) || 'Н/Д'} ₽\`\n`;
  message += `*Поступившая оплата:* \`${ОплатаПоступившая?.toFixed(2) || 'Н/Д'} ₽\`\n`;
  message += `*Дата платежа:* \`${ДатаПлатежа || 'Н/Д'} ₽\`\n`;
  message += `*Объем:* \`${Объем || 'Н/Д'} куб.м\`\n`;

  return message;
};

export const formatElektroData = data => {
  const { Период, начислено, Показание, СуммаПлатежа, ДатаПлатежа, Долг } = data;
  const [month, year] = Период.split('.');
  const periodDate = new Date(year, month - 1);
  const periodString = periodDate.toLocaleString('ru', { month: 'long', year: 'numeric' });

  let message = `💡 *Данные по Электроэнергии за ${periodString}*\n\n`;
  message += `*Начислено:* \`${начислено?.toFixed(2) || 'Н/Д'} ₽\`\n`;
  message += `*Показание:* \`${Показание || 'Н/Д'}\`\n`;
  message += `*Долг на конец периода:* \`${Долг || '0.00'} ₽\`\n\n`;
  message += '*Платеж в периоде:*\n';
  message += `*Сумма:* \`${СуммаПлатежа || 'Н/Д'} ₽\`\n`;
  message += `*Дата:* \`${ДатаПлатежа || 'Н/Д'}\``;

  return message;
};
