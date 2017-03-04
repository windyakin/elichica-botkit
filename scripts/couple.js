const Cherrio = require('cheerio');
const Promise = require('bluebird');
const Request = require('request-promise');

module.exports = (botkit) => {
	const eli = new Eli();
	const pixiv = new Pixiv();

	botkit.hears(['花園'], ['ambient'], (bot, message) => {
		let couple = (new Character()).getRandomCouple();

		bot.reply(message, eli.getBefore() + '「 *' + couple.join('') + '* 」' + eli.getAfter());

		pixiv.getCouplingAllCount(couple)
		.then((count) => {
			bot.reply(message, 'ちなみにpixivで「' + couple.join('') + '」は *' + count + '件* の投稿があるらしいわ');
		})
		.catch((err) => bot.reply(message, 'pixivからの取得はできなかったわ…'));

	});
};

class Character {
	constructor() {
		this.chara = ['ほの', 'こと', 'うみ', 'にこ', 'のぞ', 'えり', 'まき', 'りん', 'ぱな'];
	}

	removeCharacter(index) {
		this.chara.splice(index, 1);
	}

	getRandomCouple() {
		let couple = [];
		for (let i = 0; i < 2; i++) {
			let rand = Math.floor(Math.random() * this.chara.length);
			couple.push(this.chara[rand]);
			this.removeCharacter(rand);
		}
		return couple;
	}
}

class Eli {
	pickRandom(array) {
		return array[Math.floor(Math.random() * array.length)];
	}

	before() {
		return ([
			'そうね',
			'やっぱり',
			'それなら',
			'今日は'
		]);
	}

	after() {
		return ([
			'なんてどうかしら',
			'がいいんじゃないかしら',
			'で語ってみましょう？',
			'がステキだと思わない？'
		]);
	}

	getBefore() {
		return this.pickRandom(this.before());
	}

	getAfter() {
		return this.pickRandom(this.after());
	}
}

class Pixiv {
	constructor(couple) {
		this.total = 0;
		this.url = 'http://www.pixiv.net/tags.php';
	}

	isNumber(x) {
		if (typeof(x) !== 'number' && typeof(x) !== 'string') {
			return false;
		}
		else {
			return x === parseFloat(x) && isFinite(x);
		}
	}

	getCouplingCount(couple) {
		return Request.get({
			url: this.url,
			qs: { tag: couple },
	    transform: (body) => {
      	return Cherrio.load(body);
  		}
		})
		.then(($) => {
			return new Promise((resolve, reject) => {
				let count = 0;
				$('.more').each((i, elem) => {
					let text = $(elem).text();
					let num = parseInt(text.replace(/^[^\d]*(\d+) 件/, '$1'), 10);
					if (this.isNumber(num)) {
						count += num;
					}
				});
				resolve(count);
			});
		})
		.catch((err) => {
			console.error(err);
			Promise.reject(err);
		});
	}

	getCouplingAllCount(couple) {
		return new Promise((resolve, reject) => {
			Promise.all([
				this.getCouplingCount(couple.join('')),
				this.getCouplingCount(couple.reverse().join(''))
			])
			.spread((count1, count2) => {
				resolve(count1 + count2);
			})
			.catch((err) => reject(err));
		});
	}
}
