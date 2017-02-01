#!/usr/bin/env node

'use strict';

require('dotenv').config({'path': './.environment'});

const BotKit       = require('botkit');
const storage      = require('botkit-storage-redis');
const Promise      = require('bluebird');
const Path         = require('path');
const File         = Promise.promisifyAll(require('fs'));
const Program      = require('commander');
const GitHubAPI    = require('github');
const Calendar     = require(__dirname + '/lib/google-calendar.js');
const CalendarUtil = require(__dirname + '/lib/google-calendar-util.js');
const CronJob      = require(__dirname + '/lib/cron.js');
const Util         = require(__dirname + '/lib/botkit-util.js');

Program
	.version('1.0.0')
	.option('-d, --debug', 'Botkit debug mode')
	.option('-t, --token [token]', 'Slack Token')
	.option('-c, --channel [channel]', 'Debug info throw channel')
	.option('-g, --github [github_token]', 'GitHub OAuth token')
	.option('-r, --redis [redis_url]', 'Using strage Redis URL')
	.option('-g. --google [path]', 'Google OAuth client secret file')
	.parse(process.argv);

// Main exec code
getGoogleAuthCode().done((auth) => startAobaBot(auth));

// Google OAuth
function getGoogleAuthCode() {
	const GOOGLE_CLIENT_SECRET_PATH = process.env.GOOGLE_CLIENT_SECRET_PATH || Program.google;
	return new Promise((resolve, reject) => {
		if (GOOGLE_CLIENT_SECRET_PATH) {
			let calendar = new Calendar(GOOGLE_CLIENT_SECRET_PATH);
			calendar.auth()
				.then(auth => {
					resolve(auth);
				})
				.catch(err => {
					reject(err);
				});
		}
		else {
			resolve(null);
		}
	});
}

function loadScripts(dirName, botkit, bot) {
	return new Promise((resolve, reject) => {
		File.readdirAsync(Path.join(__dirname, dirName))
			.then(files => {
				files.forEach(file => {
					if (file.match(/\.js$/)) {
						try {
							require(Path.join(__dirname, dirName, file))(botkit, bot);
						}
						catch (err) {
							console.error(err);
						}
					}
				});
			})
			.done(() => {
				return resolve();
			});
	});
}

function startAobaBot(googleAuth) {
	// Redis
	let botkit = BotKit.slackbot({
		'debug': Program.debug,
		'storage': storage({'url': process.env.REDIS_URL || 'redis://localhost:6379'}),
		'google': googleAuth,
		'debug_channel': process.env.DEBUG_INFO_CHANNEL || Program.channel
	});

	// Botkit connection
	const BOTKIT_SLACK_TOKEN = process.env.BOTKIT_SLACK_TOKEN || Program.token;
	if (!BOTKIT_SLACK_TOKEN) {
		console.error('Error: Specify token in environment or command run option `--token [token]`');
		process.exit(1);
	}
	botkit.spawn({
		'token': BOTKIT_SLACK_TOKEN,
	}).startRTM((err, bot, payload) => {
		// Append botkit cron job function
		botkit.cron = new CronJob(bot);

		// Append GitHub api function
		botkit.github = new GitHubAPI();
		const GITHUB_TOKEN = process.env.GITHUB_TOKEN || Program.github;
		if (GITHUB_TOKEN) {
			botkit.github.authenticate({
				type: 'oauth',
				token: GITHUB_TOKEN
			});
		}

		botkit.calendar = new CalendarUtil(botkit.config.google);

		botkit.util = new Util(bot);

		// load script file
		Promise.all([
			botkit.util.channel.getChannelList(),
			loadScripts('scripts', botkit),
			loadScripts('commands', botkit),
			loadScripts('original', botkit)
		])
		.then(() => {
			if (botkit.config.debug_channel !== undefined) {
				bot.say({
					'channel': botkit.util.channel.getChannelID(botkit.config.debug_channel),
					'text': '<!here|@here> おはようございまーす！'
				});
			}
		});
	});
}
