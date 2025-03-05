require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const winston = require('winston');
const { TwitterApi } = require('twitter-api-v2');
const tweetRoutes = require('./routes/tweet');
const cors = require('cors');

const User = require('./models/User'); // Adjust if folder structure differs

const app = express();
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.simple(),
	transports: [new winston.transports.File({ filename: 'app.log' })],
});

// Middleware
app.use(express.json());
const allowedOrigins = [
	'http://localhost:5173',
	'https://auto-tweet-prayag-09-prayag-09s-projects.vercel.app',
	'https://auto-tweet-4e0ig5uxi-prayag-09s-projects.vercel.app',
	'https://auto-tweet-prayag-09-prayag-09s-projects.vercel.app',
];

app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error('Not allowed by CORS'));
			}
		},
		credentials: true,
	})
);

// Database Connection
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => logger.info('Connected to MongoDB'))
	.catch((err) => logger.error('MongoDB connection error:', err));

// Twitter OAuth 2.0 Client
const twitterClient = new TwitterApi({
	clientId: process.env.TWITTER_CLIENT_ID,
	clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Store code verifiers temporarily
const codeVerifiers = new Map();

// OAuth 2.0 Routes
app.get('/auth/twitter', (req, res) => {
	const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
		process.env.CALLBACK_URL,
		{ scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
	);
	codeVerifiers.set(state, codeVerifier);
	res.redirect(url);
});

app.get('/auth/twitter/callback', async (req, res) => {
	const { code, state } = req.query;
	const codeVerifier = codeVerifiers.get(state);

	if (!codeVerifier) {
		logger.error('Invalid or missing state in OAuth callback');
		return res.status(400).json({ error: 'Invalid authentication state' });
	}

	try {
		const { client, accessToken, refreshToken } =
			await twitterClient.loginWithOAuth2({
				code,
				codeVerifier,
				redirectUri: process.env.CALLBACK_URL,
			});
		const me = await client.v2.me(); // Get user info
		const user = await User.findOneAndUpdate(
			{ twitterId: me.data.id },
			{ accessToken, refreshToken },
			{ upsert: true, new: true }
		);
		logger.info('OAuth 2.0 successful', { twitterId: me.data.id });
		codeVerifiers.delete(state);
		res.json({ message: 'Authentication successful', userId: user._id });
	} catch (error) {
		logger.error('OAuth 2.0 error:', error);
		res
			.status(500)
			.json({ error: 'Authentication failed', details: error.message });
	}
});

// API Routes
app.use('/api', tweetRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () =>
	logger.info(`Server running on port ${PORT}`)
);

// Graceful Shutdown
process.on('SIGINT', () => {
	server.close(() => {
		logger.info('Server shut down');
		mongoose.connection.close();
		process.exit(0);
	});
});
