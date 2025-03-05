import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
	const [tweetText, setTweetText] = useState('');
	const [scheduledTime, setScheduledTime] = useState('');
	const [tweets, setTweets] = useState([]);
	const [error, setError] = useState(null);
	const userId = '67c7f4f6d85284053fca38a3';

	// Fetch scheduled tweets
	const fetchTweets = async () => {
		try {
			const res = await axios.get(
				'https://auto-tweet-kf31.onrender.com/api/scheduled-tweets',
				{
					headers: { 'X-User-Id': userId },
				}
			);
			setTweets(res.data);
			setError(null);
		} catch (err) {
			setError('Failed to fetch tweets');
		}
	};

	useEffect(() => {
		fetchTweets();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			// Convert IST input to UTC for backend (IST is UTC+5:30)
			const istDate = new Date(scheduledTime);
			const utcDate = new Date(
				istDate.getTime() - 5.5 * 60 * 60 * 1000
			).toISOString();

			await axios.post(
				'https://auto-tweet-kf31.onrender.com/api/schedule-tweet',
				{ tweetText, scheduledTime: utcDate },
				{ headers: { 'X-User-Id': userId } }
			);
			setTweetText('');
			setScheduledTime('');
			fetchTweets();
			setError(null);
		} catch (err) {
			setError('Failed to schedule tweet');
		}
	};

	// Handle tweet deletion
	const handleDelete = async (id) => {
		try {
			await axios.delete(
				`https://auto-tweet-kf31.onrender.com/api/scheduled-tweet/${id}`,
				{
					headers: { 'X-User-Id': userId },
				}
			);
			fetchTweets();
			setError(null);
		} catch (err) {
			setError('Failed to delete tweet');
		}
	};

	// Format UTC time from backend to IST for display
	const formatIST = (utcTime) => {
		const utcDate = new Date(utcTime);
		const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
		return istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
	};

	return (
		<div className='min-h-screen bg-gray-100 flex flex-col items-center py-8'>
			<h1 className='text-3xl font-bold text-blue-600 mb-6'>Tweet Scheduler</h1>

			{/* Form */}
			<form
				onSubmit={handleSubmit}
				className='w-full max-w-md bg-white p-6 rounded-lg shadow-md'>
				<textarea
					value={tweetText}
					onChange={(e) => setTweetText(e.target.value)}
					maxLength='280'
					placeholder='Enter your tweet (max 280 chars)'
					className='w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500'
				/>
				<input
					type='datetime-local'
					value={scheduledTime}
					onChange={(e) => setScheduledTime(e.target.value)}
					className='w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500'
				/>
				<button
					type='submit'
					className='w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition duration-200'>
					Schedule Tweet
				</button>
			</form>

			{/* Error Message */}
			{error && <p className='text-red-500 mt-4'>{error}</p>}

			{/* Scheduled Tweets */}
			<h2 className='text-2xl font-semibold text-gray-800 mt-8 mb-4'>
				Scheduled Tweets
			</h2>
			<ul className='w-full max-w-md space-y-4'>
				{tweets.length === 0 ? (
					<p className='text-gray-500'>No scheduled tweets yet.</p>
				) : (
					tweets.map((tweet) => (
						<li
							key={tweet._id}
							className='flex justify-between items-center bg-white p-4 rounded-lg shadow-md'>
							<span className='text-gray-700'>
								{tweet.tweetText} -{' '}
								<span className='text-gray-500'>
									{formatIST(tweet.scheduledTime)}
								</span>
							</span>
							<button
								onClick={() => handleDelete(tweet._id)}
								className='bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition duration-200'>
								Delete
							</button>
						</li>
					))
				)}
			</ul>

			<a
				href='https://auto-tweet-kf31.onrender.com/auth/twitter'
				className='mt-6 text-blue-500 hover:underline'>
				Connect Twitter
			</a>
		</div>
	);
}

export default App;
