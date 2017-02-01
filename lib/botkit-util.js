'use strict';

const Promise  = require('bluebird');

function BotKitUtil(bot) {
	let botkitUtil = {
		'bot': bot,
		'list': {
			channel: []
		}
	};

	this.initalized = () => {
		this.channel = new ChannelList(botkitUtil);
	};

	this.initalized();
	return this;
}

function ChannelList(botkitUtil) {
	this.getChannelList = () => {
		return new Promise((resolve, reject) => {
			Promise.props({
				'channels': Promise.promisify(botkitUtil.bot.api.channels.list)({'exclude_archived': 1}),
				'groups':   Promise.promisify(botkitUtil.bot.api.groups.list)({'exclude_archived': 1})
			})
			.then((res) => {
				let origin = Array.prototype.concat(res.channels.channels, res.groups.groups);
				let list = [];
				origin.forEach((channel) => {
					list.push({'name': channel.name, 'id': channel.id});
				});
				botkitUtil.list.channel = botkitUtil.list.channel.concat(list);
			})
			.done(() => resolve());
		});
	};

	this.getChannelID = (name) => {
		if (botkitUtil.bot.botkit.config.debug) {
			name = botkitUtil.bot.botkit.config.debug_channel;
		}
		let channel = botkitUtil.list.channel.filter((item, index) => {
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
	};
}

module.exports = BotKitUtil;
