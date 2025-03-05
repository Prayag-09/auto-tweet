require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const { TwitterApi } = require('twitter-api-v2');
const mongoose = require('mongoose');
const winston = require('winston');
const Tweet = require('./models/Tweet');
const User = require('./models/User');

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.simple(),
	transports: [new winston.transports.File({ filename: 'worker.log' })],
});

// Redis Configuration
const redisConfig = {
	host: process.env.REDIS_HOST || 'tweet-scheduler-redis',
	port: process.env.REDIS_PORT || 6379,
};
console.log('Worker Redis Config:', redisConfig); // Debug log

mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => logger.info('Worker connected to MongoDB'))
	.catch((err) => logger.error('MongoDB connection error:', err));

const worker = new Worker(
	'tweetQueue',
	async (job) => {
		const { tweetId } = job.data;
		try {
			const tweet = await Tweet.findById(tweetId).populate('userId');
			if (!tweet || tweet.status !== 'pending') {
				logger.info(
					`Skipping tweet ${tweetId}: ${!tweet ? 'not found' : 'not pending'}`
				);
				return;
			}

			const twitterClient = new TwitterApi(tweet.userId.accessToken);
			await twitterClient.v2.tweet(tweet.tweetText);
			tweet.status = 'sent';
			await tweet.save();
			logger.info(`Tweet sent: ${tweet._id}`);
		} catch (error) {
			const tweet = await Tweet.findById(tweetId);
			if (tweet) {
				tweet.status = 'failed';
				await tweet.save();
			}
			logger.error(`Tweet failed: ${tweetId}`, error);
		}
	},
	{ connection: redisConfig }
);

worker.on('failed', (job, err) => logger.error(`Job ${job.id} failed:`, err));
worker.on('completed', (job) => logger.info(`Job ${job.id} completed`));
