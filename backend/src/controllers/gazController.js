import { gazService } from '../services/gazService.js';

export const gazController = async (req, res) => {
  try {
    const savedResult = await gazService();
    return res.status(201).json(savedResult);
  } catch (error) {
    return res.status(500).json({ error: `Failed to scrape Gaz page: ${error.message}` });
  }
};
