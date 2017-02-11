'use strict';

const NodeCron = require('cron');
const CronJob  = NodeCron.CronJob;

module.exports = class Cron {
	constructor(bot) {
		this.bot = bot;
	}

	addCronJob(cronTime, cronJob) {
		return new CronJob(cronTime, () => cronJob(this.bot), null, true, 'Asia/Tokyo');
	}
};
