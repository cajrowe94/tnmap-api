import mysql from 'mysql2/promise';
import xlsx from 'node-xlsx';

const connection = await mysql.createConnection({
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
	let results = await getPlotRow(req.params.id);
	res.send(results);
}

const getPlotRow = async (plotId) => {
	let [rowResults] = await connection.execute(
		`SELECT * FROM plot
		WHERE plot_id=?`,
		[plotId]
	);

	return { rows: rowResults };
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

	let results = await findPlotRow(queryString, bodyValues);

	res.send({
		results: results
	})
}

const findPlotRow = async (queryString, bodyValues) => {
	let [rowResults] = await connection.execute(
		`SELECT plot.* FROM plot
		${queryString}`,
		bodyValues
	);

	return { rows: rowResults }
}

/**
 * -----------------------
 * Bulk update plot rows
 * /api/update-plot-rows
 */

const updatePlotRows = async (req, res, next) => {
	let fileObject = req.file;

	if (!fileObject) { res.send({ error: 'No file given' }); return }

	let fileExtension = fileObject.originalname.split('.').pop();

	if (fileExtension !== 'xlsx') { res.send({ error: 'Xlsx file required' }); return }

	let parsedFile = parseFile(fileObject);
	let updateResponse = await handlePlotRowUpdates(parsedFile);

	res.send(updateResponse);
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

const handlePlotRowUpdates = async (parsedPlotData) => {
    let response = [];

    if (parsedPlotData.length) {
		for (const item of parsedPlotData) {
			let plotResults = await findPlotRowFromXlsxData(item);
			let plotRow;

			// new row was created
			if (plotResults.insertId) {
				let newlyCreatedRow = await getPlotRow(parseInt(plotResults.insertId));

				if (newlyCreatedRow && newlyCreatedRow.rows.length) {
					plotRow = newlyCreatedRow.rows[0];
				}
			} else {
				// existing row was found
				plotRow = plotResults;
			}

			let countyRowResults = await findCountyRow(
				'WHERE county_name=?',
				[item[0]]
			);

			// missing county row
			if (!countyRowResults || !countyRowResults.rows.length) {
				response.push({ error: `Missing county: ${item[0]}, for plot number: ${item[1]}` });
			} else if (plotRow && countyRowResults.rows.length) {
				let countyRow = countyRowResults.rows[0];

				// let updatePlotResponse = await updatePlot(plot, county, item);

				// response.push({
				// 	updates: {
				// 		plot: updatePlotResponse
				// 	}
				// });
			} else {
				response.push({ error: `Something went wrong with plot number: ${item[1]}, for county: ${item[0]}` });
			}
    	}

    	return response;
    }
}

const findCountyRow = async (queryString, bodyValues) => {
	let [rowResults] = await connection.execute(
		`SELECT county.* FROM county
		${queryString}`,
		bodyValues
	);

	return { rows: rowResults }
}

/**
 * Use the xlsx data to find the matching plot row
 * If none is found, create one
 */

const findPlotRowFromXlsxData = async (item) => {
	const countyName = 0,
        plotNumber = 1,
        plotType = 2,
        plotProtocol = 3,
        plotSurveyDate = 4,
        plotCrewOne = 5,
        plotCrewTwo = 6,
        plotCrewThree = 7,
        plotCrewFour = 8;

    if (item) {
    	let parsedPlotNumber = parseInt(item[plotNumber]);
		let plotCountyName = item[countyName];

		if (
			parsedPlotNumber &&
			plotCountyName
		) {
			let plotKey = plotCountyName.toLowerCase() + '-plot-' + parsedPlotNumber;

			let plotQueryResults = await findPlotRow(
				'WHERE plot.plot_key=?',
				[plotKey]
			);

    		if (
    			!plotQueryResults ||
    			!plotQueryResults.rows.length
			) {
				try {
					// create a new plot
	    			let [newPlotRow] = await connection.execute(
	    				`INSERT INTO plot (
	    					plot_key,
	    					plot_number,
	    					plot_type,
	    					plot_protocol,
	    					plot_survey_date,
	    					plot_crew_one,
	    					plot_crew_two,
	    					plot_crew_three,
	    					plot_crew_four
						)
						VALUES (?,?,?,?,?,?,?,?,?)
						`,
						[
							plotKey || null,
							parsedPlotNumber || null,
							item[plotType] || null,
							item[plotProtocol] || null,
							item[plotSurveyDate] || null,
							item[plotCrewOne] || null,
							item[plotCrewTwo] || null,
							item[plotCrewThree] || null,
							item[plotCrewFour] || null
						]
					);

					return newPlotRow;
				} catch (err) {
					return { error: err.message }
				}
			}

    		return plotQueryResults.rows[0];
		} else {
			return [{ error: `Invalid row with plot number: ${item[plotNumber]}, county name: ${item[countyName]}` }];
		}
    } else {
    	return null;
    }
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