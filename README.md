# Instagram Auto Liker Bot

A Node.js automation script that logs into Instagram, navigates to a specified hashtag, and automatically likes the 9 most recent posts every 3 minutes.

## Features

- Automated Instagram login
- Navigates to any hashtag
- Likes the 9 most recent posts
- Runs continuously every 3 minutes
- Stays logged in (no repeated logins)
- Skips already liked posts
- Rate limiting to avoid detection

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Navigate to the project directory:
```bash
cd instagram-auto-liker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Edit `.env` and add your credentials:
```
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
INSTAGRAM_HASHTAG=photography
```

## Usage

Start the bot:
```bash
npm start
```

Or:
```bash
node index.js
```

To stop the bot, press `Ctrl+C`.

## Configuration

Edit the `.env` file to customize:

- `INSTAGRAM_USERNAME` - Your Instagram username (required)
- `INSTAGRAM_PASSWORD` - Your Instagram password (required)
- `INSTAGRAM_HASHTAG` - Hashtag to monitor (default: photography)

To change the interval, edit `LIKE_INTERVAL` in `index.js` (default: 180000ms = 3 minutes).

## Important Notes

⚠️ **Use Responsibly**:
- Instagram has rate limits and may temporarily block accounts that like too many posts
- Use at your own risk
- Consider Instagram's Terms of Service
- Don't run multiple instances simultaneously
- The bot waits 2 seconds between likes to avoid rate limiting

## How It Works

1. Launches Chrome browser
2. Logs into Instagram with your credentials
3. Navigates to the specified hashtag page
4. Identifies the 9 most recent posts
5. Opens each post and clicks the like button
6. Waits 3 minutes
7. Repeats from step 3

## Troubleshooting

**Browser doesn't start:**
- Make sure Chrome is installed
- Try running `npm install puppeteer` again

**Login fails:**
- Check your username and password in `.env`
- Instagram may require verification (check your email/phone)
- Try logging in manually first in the same browser

**Can't find posts:**
- The hashtag might be empty or blocked
- Try a different hashtag
- Check if you're logged in properly

## License

MIT