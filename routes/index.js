import express from 'express';
import multer from 'multer';
import { county, plot } from '../controllers/index.js';

const router = express.Router();

/* GET County */
router.get('/county/:id', county.getCounty);
router.get('/counties', county.findCounties);

/* GET Plot */
router.get('/plot/:id', plot.getPlot);
router.get('/plots', plot.findPlots);

/* POST Update Plot Rows */
const storage = multer.diskStorage({
	destination: '/tmp/plot-data-uploads',
	filename: function (req, file, cb) {
		let fileExtension = file.originalname.split('.').pop();
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, `${file.fieldname}-${uniqueSuffix}.${fileExtension}`);
	}
});

const upload = multer({ storage: storage });

router.post('/update-plot-rows', upload.single('xlsx-file'), plot.updatePlotRows);

export default router;