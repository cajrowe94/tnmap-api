import mysql from 'mysql2';
import xlsx from 'node-xlsx';

const connection = mysql.createConnection({
	host: process.env.DATABASE_HOST,
	port: process.env.DATABASE_PORT,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.DATABASE_NAME
});

connection.on('error', console.log);


/**
 * -----------------------
 * Get plot
 * /api/plot/:id
 */

const getPlot = async (req, res, next) => {
	connection.execute(
		`SELECT * FROM plot
		JOIN county ON plot.county_id=county.county_id
		WHERE plot_id=?`,
		[req.params.id],
		(err, results) => {
			res.send({
				error: err,
				results: results
			});
		}
	);
}

/**
 * -----------------------
 * Find plots
 * /api/plots
 */

const findPlots = async (req, res, next) => {
	let body = req.body;
	let bodyKeys = Object.keys(body);
	let bodyValues = Object.values(body);
	let queryString = '';

	if (bodyKeys.length) {
		for (let i = 0; i < bodyKeys.length; i++) {
			if (i == 0) {
				queryString += ' WHERE ';
			}

			queryString += (`plot.${bodyKeys[i]}=?`);

			if (i !== (bodyKeys.length - 1)) {
				queryString += ' AND ';
			}
		}
	}

	connection.execute(
		`SELECT plot.*, county.county_name as county_name FROM plot
		JOIN county ON plot.county_id = county.county_id
		${queryString}`,
		bodyValues,
		(err, results) => {
			res.send({
				error: err,
				results: results
			});
		}
	);
}

/**
 * -----------------------
 * Bulk update plot rows
 * /api/update-plot-rows
 */

const updatePlotRows = async (req, res, next) => {
	let fileObject = req.file;

	if (!fileObject) {
		res.send({ err: 'No file given' });
		return;
	}

	let fileExtension = fileObject.originalname.split('.').pop();

	if (fileExtension !== 'xlsx') {
		res.send({ err: 'xlsx file required' });
		return;
	}

	res.send({
		parsedObject: parseFile(fileObject)
	});
}

/**
 * Handle plot updates
 */

const updatePlot = async (plot, county, item) => {
	const countyName = 0,
        plotNumber = 1,
        plotType = 2,
        plotProtocol = 3,
        plotSurveyDate = 4,
        plotCrewOne = 5,
        plotCrewTwo = 6,
        plotCrewThree = 7,
        plotCrewFour = 8;

	let plotData = plot[0];
	let countyData = county[0];

	let updateData = {
		data: {}
	}

	let response = {
		messages: [],
		plotData: null
	}

	// plot has no county
	if (
		!plotData.county &&
		countyData.id
	) {
		updateData.data.county = { id: countyData.id };
		response.messages.push(`Updated plot county field with: ${countyData.countyName}`);
	}

	// check for any updated fields
	// love me some if statements :/

	// plot number
	if (parseInt(plotData.plotNumber) != parseInt(item[plotNumber])) {
		updateData.data.plotNumber = parseInt(item[plotNumber]);
		response.messages.push(`Changed plot number from ${plotData.plotNumber} to ${item[plotNumber]}`);
	}

	// plot type
	if (plotData.plotType != item[plotType]) {
		updateData.data.plotType = item[plotType];
		response.messages.push(`Changed plot type from ${plotData.plotType} to ${item[plotType]}`);
	}

	// plot protocol
	if (plotData.plotProtocol != item[plotProtocol]) {
		updateData.data.plotProtocol = item[plotProtocol];
		response.messages.push(`Changed plot protocol from ${plotData.plotProtocol} to ${item[plotProtocol]}`);
	}

	// plot survey date
	if (plotData.plotSurveyDate != item[plotSurveyDate]) {
		updateData.data.plotSurveyDate = item[plotSurveyDate];
		response.messages.push(`Changed plot survey date from ${plotData.plotSurveyDate} to ${item[plotSurveyDate]}`);
	}

	// plot crew one
	if (plotData.plotCrewOne != item[plotCrewOne]) {
		updateData.data.plotCrewOne = item[plotCrewOne];
		response.messages.push(`Changed plot crew one from ${plotData.plotCrewOne} to ${item[plotCrewOne]}`);
	}

	// plot crew two
	if (plotData.plotCrewTwo != item[plotCrewTwo]) {
		updateData.data.plotCrewTwo = item[plotCrewTwo];
		response.messages.push(`Changed plot crew two from ${plotData.plotCrewTwo} to ${item[plotCrewTwo]}`);
	}

	// plot crew three
	if (plotData.plotCrewThree != item[plotCrewThree]) {
		updateData.data.plotCrewThree = item[plotCrewThree];
		response.messages.push(`Changed plot crew three from ${plotData.plotCrewThree} to ${item[plotCrewThree]}`);
	}

	// plot crew four
	if (plotData.plotCrewFour != item[plotCrewFour]) {
		updateData.data.plotCrewFour = item[plotCrewFour];
		response.messages.push(`Changed plot crew four from ${plotData.plotCrewFour} to ${item[plotCrewFour]}`);
	}

	// run an update if there are any changes
	if (Object.keys(updateData.data).length > 0) {
		const updatedPlot = await strapi.entityService.update('api::plot.plot', plotData.id, updateData);
		response.plotData = updatedPlot;
	} else {
		response.messages.push(`No changes for ${plotData.plotId}`);
	}

	return response;
}

/**
 * Parse xlsx file into usable json
 */

const parseFile = (fileObject) => {
	if (
		fileObject &&
		fileObject.path
	) {
		const parsedData = xlsx.parse(fileObject.path, { raw: false }); // docker

		if (
			parsedData &&
			parsedData.length
		) {
			return parsedData[0].data;
		}

		return { data: [] }
	}
}

/**
 * -----------------------
 */

export default {
	getPlot,
	findPlots,
	updatePlotRows
}