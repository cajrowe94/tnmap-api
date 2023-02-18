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


/**
 * -----------------------
 * Get plot row by ID
 */

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


/**
 * -----------------------
 * Find plot row(s) with query
 */

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
 * -----------------------
 * Initiates creation and or updates to plot rows
 */

const handlePlotRowUpdates = async (parsedPlotData) => {
    let response = [];

    if (parsedPlotData.length) {
		for (const item of parsedPlotData) {
			let plotResults = await findPlotRowFromXlsxData(item);
			let plotRow;

			// new row was created
			if (plotResults.insertId) {
				let newPlotRow = await getPlotRow(parseInt(plotResults.insertId));

				if (newPlotRow && newPlotRow.rows.length) {
					plotRow = newPlotRow.rows[0];
					plotRow.new = true;
				}
			} else if (plotResults.plot_id) {
				// existing row was found
				plotRow = plotResults;
			}

			let countyName = item[0] || null;

			let countyRowResults = await findCountyRow(
				'WHERE county_name=?',
				[countyName]
			);

			// missing county row
			if (!countyRowResults || !countyRowResults.rows.length) {
				response.push({ error: `Missing county: ${item[0]}, for plot number: ${item[1]}` });
			} else if (plotRow && countyRowResults.rows.length) {
				let countyRow = countyRowResults.rows[0];
				let updatePlotResponse = await updatePlot(plotRow, countyRow, item);

				response.push({
					updates: {
						plot: updatePlotResponse
					}
				});
			} else {
				response.push({ error: `Something went wrong with plot number: ${item[1]}, for county: ${item[0]}` });
			}
    	}

    	return response;
    }
}

/**
 * -----------------------
 * Performs updates to a plot row
 */

const updatePlot = async (plotRow, countyRow, item) => {
	const countyName = 0,
        plotNumber = 1,
        plotType = 2,
        plotProtocol = 3,
        plotSurveyDate = 4,
        plotCrewOne = 5,
        plotCrewTwo = 6,
        plotCrewThree = 7,
        plotCrewFour = 8;

	let updateData = {}

	let response = {
		messages: [],
		// plotRow: null
	}

	if (plotRow.new) {
		response.messages.push(`New plot row created: ${plotRow.plot_key}`);
		// response.plotRow = plotRow;
	}

	// plot has no county
	if (
		!plotRow.county_id &&
		countyRow.county_id
	) {
		updateData.county_id = countyRow.county_id;
		response.messages.push(`[${plotRow.plot_key}] Updated county to ${countyRow.county_name}`);
	}

	// check for any updated fields
	// love me some if statements :/
	
	if (!plotRow.new) {
		// plot number
		if (parseInt(plotRow.plot_number) != parseInt(item[plotNumber])) {
			updateData.plot_number = parseInt(item[plotNumber]) || null;
			response.messages.push(`[${plotRow.plot_key}] Changed plot number from ${plotRow.plot_number} to ${updateData.plot_number}`);
		}

		// plot type
		if (plotRow.plot_type != item[plotType]) {
			updateData.plot_type = item[plotType] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed plot type from ${plotRow.plot_type} to ${updateData.plot_type}`);
		}

		// plot protocol
		if (plotRow.plot_protocol != item[plotProtocol]) {
			updateData.plot_protocol = item[plotProtocol] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed protocol from ${plotRow.plot_protocol} to ${updateData.plot_protocol}`);
		}

		// plot survey date
		if (plotRow.plot_survey_date != item[plotSurveyDate]) {
			updateData.plot_survey_date = item[plotSurveyDate] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed survey date from ${plotRow.plot_survey_date} to ${updateData.plot_survey_date}`);
		}

		// plot crew one
		if (plotRow.plot_crew_one != item[plotCrewOne]) {
			updateData.plot_crew_one = item[plotCrewOne] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed crew one from ${plotRow.plot_crew_one} to ${updateData.plot_crew_one}`);
		}

		// plot crew two
		if (plotRow.plot_crew_two != item[plotCrewTwo]) {
			updateData.plot_crew_two = item[plotCrewTwo] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed crew two from ${plotRow.plot_crew_two} to ${updateData.plot_crew_two}`);
		}

		// plot crew three
		if (plotRow.plot_crew_three != item[plotCrewThree]) {
			updateData.plot_crew_three = item[plotCrewThree] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed crew three from ${plotRow.plot_crew_three} to ${updateData.plot_crew_three}`);
		}

		// plot crew four
		if (plotRow.plot_crew_four != item[plotCrewFour]) {
			updateData.plot_crew_four = item[plotCrewFour] || null;
			response.messages.push(`[${plotRow.plot_key}] Changed crew four from ${plotRow.plot_crew_four} to ${updateData.plot_crew_four}`);
		}
	}

	// run an update if there are any changes
	if (Object.keys(updateData).length > 0) {
		let SET = '';
		let count = 0;
		let keysLength = Object.keys(updateData).length;

		// create the set clause
		for (let key in updateData) {
			count++;
			SET += `${key} = ?${count !== keysLength ? ',' : ''}`
		}

		let updatedPlotRow = await connection.execute(
			`
			UPDATE plot
			SET ${SET}
			WHERE plot_id = ?;
			`,
			[...Object.values(updateData), plotRow.plot_id]
		);

		// response.plotRow = updatedPlotRow;
	} else {
		response.messages.push(`[${plotRow.plot_key}] No changes`);
		// response.plotRow = plotRow;
	}

	return response;
}


/**
 * -----------------------
 * County row query
 */

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