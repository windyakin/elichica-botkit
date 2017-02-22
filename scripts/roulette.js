module.exports = (botkit) => {
	botkit.hears(['roulette'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
		let result = '';
		for (let i = 0; i < 4; i++) {
			let num = Math.floor(Math.random() * 10 % 4, 10) + 1;
			result += ':lovelive' + num + ':';
		}
		bot.reply(message, '<@' + message.user + '> ' + result);
	});
};
