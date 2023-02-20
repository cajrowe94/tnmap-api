import mysql from 'mysql2/promise';
const { createHmac } = await import('node:crypto');

const connection = await mysql.createConnection({
	host: process.env.DATABASE_HOST,
	port: process.env.DATABASE_PORT,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASSWORD,
	database: process.env.AUTH_DATABASE_NAME
});


/**
 * -----------------------
 * Verify API token
 */

const verifyApiToken = async (req, res, next) => {
	let apiToken = req.header('api_key');

	if (!apiToken) {
		let loggedRequest = await logRequest(req);
		res.status(401).send({ error: 'Unauthorized. Ask Caleb for permission!' });
		return;
	}

	const hash = createHmac('sha256', apiToken)
		.update(process.env.API_KEY_SALT)
		.digest('hex');

	let [apiKeyResults] = await connection.execute(
		`
		SELECT * FROM api_key
		WHERE api_key_value = ?
		`,
		[hash]
	);

	if (
		apiKeyResults &&
		apiKeyResults.length
	) {
		let apiKeyRow = apiKeyResults[0];
		let storedHash = apiKeyRow.api_key_value;

		if (
			storedHash === hash &&
			apiKeyRow.api_key_disabled === 0
		) {
			// log request
			let loggedRequest = await logRequest(req, apiKeyRow.api_key_id);

			// increase counter and call next
			let usageCount = parseInt(apiKeyRow.api_key_usage_count);

			let [alterResults] = await connection.execute(
				`
				UPDATE api_key
				SET api_key_usage_count = ?
				WHERE api_key_id = ?
				`,
				[(usageCount + 1), apiKeyRow.api_key_id]
			);

			next();
			return;
		} else {
			let loggedRequest = await logRequest(req);
			res.status(401).send({ error: 'Unauthorized. Ask Caleb for permission!' });
			return;
		}

	}

	let loggedRequest = await logRequest(req);
	res.status(401).send({ error: 'Unauthorized. Ask Caleb for permission!' });
}


/**
 * -----------------------
 * Log API Request
 */

const logRequest = async (req, apiKeyId) => {
	let [logRow] = await connection.execute(
		`
		INSERT INTO api_log(
			api_log_ip,
			api_log_key_id,
			api_log_method,
			api_log_host,
			api_log_url,
			api_log_date
		)
		VALUES (?,?,?,?,?, NOW())
		`,
		[
			req.ip || null,
			apiKeyId || null,
			req.method || null,
			req.hostname || null,
			req.originalUrl || null
		]
	);

	return logRow;
}


/**
 * -----------------------
 */

export default { verifyApiToken }
