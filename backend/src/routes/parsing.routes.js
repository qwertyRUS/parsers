import express from 'express';
import { gazController } from '../controllers/gazController.js';
import { elektroController } from '../controllers/elektroController.js';
import { sudController } from '../controllers/sudController.js';
import { fsspController } from '../controllers/fsspController.js';

const router = express.Router();

router.post('/gaz', gazController);
router.post('/elektro', elektroController);
router.post('/sud', sudController);
router.post('/fssp', fsspController);

export default router;
