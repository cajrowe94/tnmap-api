import express from 'express';
import { county } from '../controllers/index.js';

const router = express.Router();

router.get('/county', county.getCounty);
router.get('/counties', county.getCounties);

export default router;