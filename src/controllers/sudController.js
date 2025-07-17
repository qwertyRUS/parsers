import { sudService } from '../services/sudService.js';

export const sudController = async (req, res) => {
  try {
    const savedResult = await sudService();
    return res.status(201).json(savedResult);
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка парсинга сайта суда', error: error.message });
  }
};
