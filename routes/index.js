import express from 'express';
import { county, plot } from '../controllers/index.js';

const router = express.Router();

/* County */
router.get('/county/:id', county.getCounty);
router.get('/counties', county.findCounties);

/* Plot */
router.get('/plot/:id', plot.getPlot);
router.get('/plots', plot.findPlots);

export default router;