FROM node:6.10

COPY . /app

RUN cd /app \
	&& yarn

WORKDIR /app
CMD ["node", "bot.js"]
