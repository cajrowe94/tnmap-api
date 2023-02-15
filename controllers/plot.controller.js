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
 */

export default {
	getPlot,
	findPlots
}