'use strict';

const NodeCron  = require('cron');
const CronJob   = NodeCron.CronJob;

function Cron(bot) {
	let cron = {
		'bot': bot
	};

	this.addCronJob = (cronTime, cronJob) => {
		return new CronJob(cronTime, () => cronJob(cron.bot), null, true, 'Asia/Tokyo');
	};

	return this;
};

module.exports = Cron;
