


/**
 * -----------------------
 * Get County
 */

const getCounty = async (req, res, next) => {
	res.send('get county');
}

/**
 * -----------------------
 * Get Counties
 */

const getCounties = async (req, res, next) => {
	res.send('get counties');
}

/**
 * -----------------------
 */

export default {
	getCounty,
	getCounties
}