'use strict';

const Promise = require('bluebird');

// GitHub
module.exports = (botkit) => {
	let githubPattern = 'https?://github.com/([^/]+)/([^/]+)/(?:pull|issues)/(\\d+)/?';

	botkit.hears([githubPattern], ['ambient'], (bot, message) => {
		let attachments = [];
		const regexp = {
			single: new RegExp(githubPattern),
			multi: new RegExp(githubPattern, 'g')
		};
		let hits = (message.text.match(regexp.multi) || []);
		let generateAttachment = hits.length > 1 ? generateMiniAttachment : generateFullAttachment;

		(function loopGitHubFetchAsync(i) {
			if (i < hits.length) {
				let results = regexp.single.exec(hits[i]);
				let user = results[1];
				let repo = results[2];
				let number = results[3];
				return isPrivateRepo(user, repo)
					.then((isPrivate) => {
						if (!isPrivate) {
							return Promise.reject('Not private repos');
						}
						else {
							return botkit.github.issues.get({user: user, repo: repo, number: number});
						}
					})
					.then((res) => {
						attachments.push(generateAttachment(user, repo, res));
					})
					.catch(() => {})
					.then(() => loopGitHubFetchAsync(i + 1));
			}
			return Promise.resolve(i);
		})(0).then(() => {
			bot.reply(message, {
				attachments: attachments
			});
		});

	});

	function isPrivateRepo(user, repo) {
		let fullname = user + '/' + repo;
		return new Promise((resolve, reject) => {
			botkit.storage.teams.get(fullname, (err, data) => {
				if (err) {
					reject(err);
				}
				if (data === null) {
					botkit.github.repos.get({'user': user, 'repo': repo})
						.then(res => {
							botkit.storage.teams.save({'id': fullname, 'private': res.private});
							resolve(res.private);
						});
				}
				else {
					resolve(data.private);
				}
			});
		});
	}

	function md2slack(md) {
		let replaced = [];
		md.split('\r\n').forEach((line) => {
			line = line.replace(/^( +)?\*+ ?(.+)/g, '$1• $2');
			line = line.replace(/^#+ ?(.+)/g, '*$1*');
			line = line.replace(/!\[(.*)\]\((https?):\/\/([^\)]+)\)/g, '<$2://$3|$1>');
			replaced.push(line);
		});
		return replaced.join('\r\n');
	}

	function pickupImages(md) {
		let images = [];
		md.split('\\r\\n').forEach((line) => {
			console.log();
			if (line.match('!\\[.*\\]\\((https?)://([^\\)]+)\\.((?:png|jpg|gif))\\)')) {
				images.push(RegExp.$1 + '://' + RegExp.$2 + '.' + RegExp.$3);
			}
		});
		return images;
	}

	function generateFullAttachment(user, repo, res) {
		return {
			'color': '#64b5f6',
			'author_name': user + '/' + repo,
			'author_link': 'https://github.com/' + user + '/' + repo,
			'author_icon': 'https://github.com/favicon.ico',
			'title': '#' + res.number + ' ' + res.title,
			'title_link': res.html_url,
			'text': md2slack(res.body),
			'image_url': pickupImages(res.body)[0],
			'mrkdwn_in': ['text'],
			'footer': res.user.login,
			'footer_icon': res.user.avatar_url,
			'ts': (new Date(res.created_at).getTime() / 1000)
		};
	}

	function generateMiniAttachment(user, repo, res) {
		return {
			'color': '#64b5f6',
			'author_name': res.user.login,
			'author_link': 'https://github.com/' + res.user.login,
			'author_icon': res.user.avatar_url,
			'title': '#' + res.number + ' ' + res.title,
			'title_link': res.html_url,
			'ts': (new Date(res.created_at).getTime() / 1000)
		};
	}

};
