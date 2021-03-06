'use strict';

const Promise  = require('bluebird');
const Google   = require('googleapis');
const Calendar = Google.calendar('v3');
const moment   = require('moment');

module.exports = class GoogleCalendarUtil {
	constructor(auth) {
		this.auth = auth;
	}

	getHolidays(startDate, endDate) {
		if (endDate === void 0) {
			endDate = startDate;
		}
		return new Promise((resolve, reject) => {
			Promise.promisify(Calendar.events.list)({
				'auth': this.auth,
				// Google公式の祝日カレンダー
				'calendarId': 'ja.japanese%23holiday@group.v.calendar.google.com',
				'timeMin': startDate.startOf('day').toDate().toISOString(),
				'timeMax': endDate.endOf('day').toDate().toISOString(),
				'maxResults': 20,
				'singleEvents': true,
				'orderBy': 'startTime'
			})
			.then((res) => {
				resolve(res.items);
			})
			.catch((err) => {
				console.error(err);
				reject(err);
			});
		});
	}

	isHoliday(date) {
		return new Promise((resolve, reject) => {
			this.getHolidays(date)
				.then((holidays) => {
					holidays.forEach((holiday) => {
						if (holiday && holiday.start.date === date) {
							resolve(true);
						}
					});
					resolve(false);
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	getDayEvents(startDate, endDate) {
		if (endDate === void 0) {
			endDate = startDate;
		}
		// 日本時間
		moment().locale('ja');
		return new Promise((resolve, reject) => {
			Promise.promisify(Calendar.events.list)({
				'auth': this.auth,
				'calendarId': 'primary',
				'timeMin': moment(startDate).startOf('day').toDate().toISOString(),
				'timeMax': moment(endDate).endOf('day').toDate().toISOString(),
				'maxResults': 20,
				'singleEvents': true,
				'orderBy': 'startTime'
			})
			.then((res) => {
				resolve(res.items);
			})
			.catch((err) => {
				console.error(err);
				reject(err);
			});
		});
	}

	isEventDate(name) {
		return new Promise((resolve, reject) => {
			this.getDayEvents(moment())
			.then((events) => {
				events.forEach(event => {
					if (event.summary === name) {
						resolve(true);
					}
				});
				resolve(false);
			})
			.catch((err) => {
				reject(err);
			});
		});
	}

	announceEventDate(args) {
		return new Promise((resolve, reject) => {
			this.isEventDate(args.event)
			.then((isEvent) => {
				if (isEvent) {
					let id = args.bot.botkit.util.channel.getChannelID(args.channel);
					args.bot.say({
						'channel': id,
						'text': args.text,
						'mrkdwn': true
					});
				}
			})
			.catch((err) => {
				reject(err);
			});
		});
	}
}
