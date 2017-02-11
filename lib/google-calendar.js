'use strict';

const GoogleAuth   = require('google-auth-library');
const ReadLine     = require('readline');
const Promise      = require('bluebird');
const File         = Promise.promisifyAll(require('fs'));
const Path         = require('path');

module.exports = class GoogleCalendar {
	constructor(tokenPath) {
		this.tokenPath = tokenPath;
	}

	auth() {
		console.log('info: ** Google Calendar authorization phase');
		return new Promise((resolve, reject) => {
			this.loadSecret()
				.catch((err) =>
					reject(err)
				)
				.then((credentials) =>
					this.authorize(credentials)
				)
				.catch((oauth2Client) =>
					this.getNewToken(oauth2Client)
				)
				.done((oauth2Client) =>
					resolve(oauth2Client)
				);
		});
	}

	loadSecret() {
		return new Promise((resolve, reject) => {
			File.readFileAsync(Path.dirname(this.tokenPath) + '/client_secret.json')
				.then((content) => {
					try {
						let json = JSON.parse(content);
						resolve(json);
					}
					catch (e) {
						reject(e);
					}
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	authorize(credentials) {
		let client = {
			'secret': credentials.installed.client_secret,
			'id': credentials.installed.client_id,
			'redirect': credentials.installed.redirect_uris[0]
		};
		let auth = new GoogleAuth();
		let oauth2Client = new auth.OAuth2(client.id, client.secret, client.redirect);

		return new Promise((resolve, reject) => {
			File.readFileAsync(this.tokenPath)
				.then((token) => {
					try {
						let json = JSON.parse(token);
						oauth2Client.credentials = json;
					}
					catch (err) {
						console.error(err);
						reject(oauth2Client); // => getNewToken()
					}
					resolve(oauth2Client);
				})
				.catch((err) =>
					reject(oauth2Client) // => getNewToken()
				);
		});
	}

	getNewToken(oauth2Client) {
		let authUrl = oauth2Client.generateAuthUrl({
			'access_type': 'offline',
			'scope': ['https://www.googleapis.com/auth/calendar.readonly']
		});
		console.log('Authorize this app by visiting this url:', authUrl);
		let r1 = ReadLine.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		return new Promise((resolve, reject) => {
			r1.question('Enter the code from that page here:', code => {
				r1.close();
				oauth2Client.getToken(code, (err, token) => {
					if (err) {
						console.error('Error while trying to retrieve access token');
						reject(err);
					}
					oauth2Client.credentials = token;
					File.writeFileAsync(this.tokenPath, JSON.stringify(token));
					resolve(oauth2Client);
				});
			});
		});
	}
};
