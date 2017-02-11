'use strict';

const Promise  = require('bluebird');

module.exports = class BotKitUtil {
	constructor(bot) {
		this.bot = bot;
		this.list = {channel: []};

		this.channel = new ChannelList(this);
	}
};

class ChannelList {
	constructor(util) {
		this.util = util;
	}

	getChannelList() {
		return new Promise((resolve, reject) => {
			Promise.props({
				'channels': Promise.promisify(this.util.bot.api.channels.list)({'exclude_archived': 1}),
				'groups':   Promise.promisify(this.util.bot.api.groups.list)({'exclude_archived': 1})
			})
			.then((res) => {
				let origin = Array.prototype.concat(res.channels.channels, res.groups.groups);
				let list = [];
				origin.forEach((channel) => {
					list.push({'name': channel.name, 'id': channel.id});
				});
				this.util.list.channel = this.util.list.channel.concat(list);
			})
			.done(() => resolve());
		});
	}

	getChannelID(name) {
		if (this.util.bot.botkit.config.debug) {
			name = this.util.bot.botkit.config.debug_channel;
		}
		let channel = this.util.list.channel.filter((item, index) => {
			return (item.name === name);
		});
		if (channel.length === 1) {
			if (channel[0].hasOwnProperty('id')) {
				return channel[0].id;
			}
			else {
				throw new Error('Not exist \'id\' property to the channel list');
			}
		}
		else if (channel.length > 1) {
			throw new Error('The specified channel is not uniquely determined');
		}
		else {
			throw new Error('The specified channel is not found');
		}
	}
}
