require('dotenv').config();
const express = require('express');
const router = express.Router();
const { Queue } = require('bullmq');
const Tweet = require('../models/Tweet');

// Redis Configuration
const redisConfig = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT || 6379,
};

const tweetQueue = new Queue('tweetQueue', { connection: redisConfig });

// Middleware to extract userId (simplified; assumes user is authenticated)
const getUserId = (req, res, next) => {
	// In production, use a proper auth middleware (e.g., JWT or session)
	req.userId = req.headers['x-user-id']; // Temporary header-based user ID
	if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
	next();
};

// Schedule a Tweet
router.post('/schedule-tweet', getUserId, async (req, res) => {
	const { tweetText, scheduledTime } = req.body;
	if (!tweetText || !scheduledTime) {
		return res.status(400).json({ error: 'Missing required fields' });
	}
	if (tweetText.length > 280) {
		return res.status(400).json({ error: 'Tweet exceeds 280 characters' });
	}

	try {
		const tweet = new Tweet({
			tweetText,
			scheduledTime,
			userId: req.userId,
		});
		await tweet.save();
		await tweetQueue.add(
			'tweet',
			{ tweetId: tweet._id },
			{
				delay: Math.max(0, new Date(scheduledTime) - Date.now()), // Ensure non-negative delay
				jobId: tweet._id.toString(), // Consistent job ID for cancellation
			}
		);
		res.status(201).json(tweet);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to schedule tweet', details: error.message });
	}
});

// View Scheduled Tweets
router.get('/scheduled-tweets', getUserId, async (req, res) => {
	try {
		const tweets = await Tweet.find({ userId: req.userId, status: 'pending' });
		res.json(tweets);
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to fetch tweets', details: error.message });
	}
});

// Delete a Scheduled Tweet
router.delete('/scheduled-tweet/:id', getUserId, async (req, res) => {
	try {
		const tweet = await Tweet.findOne({
			_id: req.params.id,
			userId: req.userId,
		});
		if (!tweet) return res.status(404).json({ error: 'Tweet not found' });
		if (tweet.status !== 'pending') {
			return res.status(400).json({ error: 'Cannot delete non-pending tweet' });
		}
		const job = await tweetQueue.getJob(tweet._id.toString());
		if (job) await job.remove();
		await tweet.remove();
		res.json({ message: 'Tweet deleted' });
	} catch (error) {
		res
			.status(500)
			.json({ error: 'Failed to delete tweet', details: error.message });
	}
});

module.exports = router;
