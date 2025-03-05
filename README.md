# Tweet Scheduler

A Node.js app with a React frontend to schedule and post tweets using X's API.

## Setup

1. Clone the repo: `git clone <repo-url>`
2. Install backend dependencies: `npm install`
3. Install frontend dependencies: `cd client && npm install`
4. Set up MongoDB and Redis locally or via cloud services.
5. Create a `.env` file (see above).
6. Get X API credentials from https://developer.twitter.com/.

## Running Locally

1. Start MongoDB: `mongod`
2. Start Redis: `redis-server`
3. Run backend: `npm start`
4. Run worker: `npm run worker`
5. Run frontend: `cd client && npm start`

## API Endpoints

- `GET /auth/twitter`: Start OAuth 2.0 flow
- `GET /auth/twitter/callback`: Handle OAuth callback
- `POST /api/schedule-tweet`: Schedule a tweet
- `GET /api/scheduled-tweets`: List pending tweets
- `DELETE /api/scheduled-tweet/:id`: Delete a tweet

## Deployment

- Use Docker for backend/worker.
- Deploy frontend separately (e.g., Vercel).
- Store tokens securely in a database, not `.env`.

## Notes

- Replace `your-static-verifier` with a secure OAuth 2.0 code verifier.
- Test rate limits with `twitter-api-v2` retry logic.
