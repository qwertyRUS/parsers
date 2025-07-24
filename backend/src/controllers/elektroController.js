import { logger } from '../../logger.js';
import { elektroService } from '../services/elektroService.js';

export const elektroController = async (req, res) => {
  try {
    const savedResult = await elektroService();
    return res.status(201).json(savedResult);
  } catch (error) {
    logger.error('Error in Elektro controller:', error);
    return res.status(500).json({ error: `Failed to scrape Elektro page: ${error.message}` });
  }
};
