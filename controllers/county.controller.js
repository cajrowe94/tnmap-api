import mysql from 'mysql2';

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
 * Get county
 * /api/county/:id
 */

const getCounty = (req, res, next) => {
	connection.execute(
		`SELECT county.*, plot.plot_id, plot.plot_key, plot.plot_survey_date
		FROM county
		LEFT JOIN plot ON county.county_id=plot.county_id
		WHERE county.county_id = ?`,
		[req.params.id],
		(err, results) => {
			let formattedResult = [];

			if (results.length) {
				let countyName = results[0].county_name;
				let countyId = results[0].county_id;

				let newFormattedResult = {
					county_id: countyId,
					county_name: countyName,
					plots: []
				};

				results.forEach(result => {
					if (
						result &&
						result.county_id === countyId &&
						result.plot_id
					) {
						newFormattedResult.plots.push(result);
					}
				});

				formattedResult.push(newFormattedResult);
			}

			res.send({
				error: err,
				results: formattedResult
			});
		}
	);
}


/**
 * -----------------------
 * Find counties
 * /api/counties
 */

const findCounties = (req, res, next) => {
	let body = req.body;
	let bodyKeys = Object.keys(body);
	let bodyValues = Object.values(body);
	let queryString = '';

	if (bodyKeys.length) {
		for (let i = 0; i < bodyKeys.length; i++) {
			if (i == 0) {
				queryString += ' WHERE ';
			}

			queryString += (`county.${bodyKeys[i]}=?`);

			if (i !== (bodyKeys.length - 1)) {
				queryString += ' AND ';
			}
		}
	}

	connection.execute(
		`SELECT county.*, plot.plot_id, plot.plot_key, plot.plot_survey_date
		FROM county
		LEFT JOIN plot
		ON county.county_id = plot.county_id
		${queryString}`,
		bodyValues,
		(err, results) => {
			let formattedResults = [];

			results.forEach(result => {
				let countyName = result.county_name;
				let hasFormattedResult = false;

				formattedResults.forEach(formattedResult => {
					if (formattedResult.county_name == countyName) {
						formattedResult.plots = formattedResult.plots || [];

						formattedResult.plots.push(result);

						hasFormattedResult = true;
						return;
					}
				});

				if (!hasFormattedResult) {
					let newFormattedResult = {
						county_id: result.county_id,
						county_name: result.county_name,
						plots: []
					};

					if (result.plot_id) {
						newFormattedResult.plots.push(result);
					}

					formattedResults.push(newFormattedResult);
				}
			});

			res.send({
				error: err,
				results: formattedResults
			});
		}
	);
}


/**
 * -----------------------
 */

export default {
	getCounty,
	findCounties
}