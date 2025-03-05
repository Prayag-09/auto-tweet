// models/Tweet.js
const mongoose = require('mongoose');
const tweetSchema = new mongoose.Schema({
	tweetText: { type: String, required: true, maxlength: 280 },
	scheduledTime: { type: Date, required: true },
	status: {
		type: String,
		enum: ['pending', 'sent', 'failed'],
		default: 'pending',
	},
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});
module.exports = mongoose.model('Tweet', tweetSchema);
