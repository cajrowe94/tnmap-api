import express from 'express';
import { county } from '../controllers/index.js';

const router = express.Router();

router.get('/county/:id', county.getCounty);
router.get('/counties', county.findCounties);

export default router;