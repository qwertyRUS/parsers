import { logger } from '../../logger.js';
import { fsspService } from '../services/fsspService.js';

export const fsspController = async (req, res) => {
  try {
    const savedResult = await fsspService();
    return res.status(201).json(savedResult);
  } catch (error) {
    logger.error('Error in FSSP controller:', error);
    return res.status(500).json({ error: `FSSP to scrape FSSP page: ${error.message}` });
  }
};
