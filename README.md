# Instagram Auto Liker Bot

A Node.js automation script that logs into Instagram and automatically likes posts from multiple hashtags. Designed to simulate human behavior with randomized delays and smart post detection.

## Features

- ✨ Automated Instagram login with retry logic
- 📱 Support for multiple hashtags
- 🎯 Configurable number of posts per hashtag
- ⏱️ Runs continuously with configurable intervals
- 🔄 Stays logged in (no repeated logins)
- ✅ Skips already liked posts
- 🎲 Randomized delays to simulate human behavior (10-12 seconds between hashtags)
- 🛡️ Rate limiting to avoid detection
- 📊 Detailed statistics tracking per hashtag and total
- 🧹 Clean, maintainable code following SOLID principles

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
```env
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password
INSTAGRAM_HASHTAGS=["lithuania","lietuva","vilnius","kaunas","visitlithuania"]
POSTS_PER_HASHTAG=9
CHROME_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
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

### Required Settings
- `INSTAGRAM_USERNAME` - Your Instagram username (**required**)
- `INSTAGRAM_PASSWORD` - Your Instagram password (**required**)

### Optional Settings
- `INSTAGRAM_HASHTAGS` - JSON array of hashtags to monitor (default: `["photography"]`)
  - Example: `["travel","nature","photography","architecture"]`
  - The bot will cycle through each hashtag in order

- `POSTS_PER_HASHTAG` - Number of posts to like per hashtag (default: `9`)
  - Recommended: 4-9 posts to avoid rate limiting

- `CHROME_PATH` - Path to Chrome executable (default: Mac default path)
  - Mac: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
  - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
  - Linux: `/usr/bin/google-chrome`

### Advanced Configuration

To change timing settings, edit the `Config` object in `index.js`:

- `CYCLE_INTERVAL` - Time between like cycles (default: 180000ms = 3 minutes)
- `HASHTAG_PAUSE_BASE` - Base pause time between hashtags (default: 10000ms = 10 seconds)
- `HASHTAG_PAUSE_RANDOM` - Random additional time (default: 2000ms = 0-2 seconds)
- `BETWEEN_LIKES_DELAY` - Delay between individual likes (default: 2000ms = 2 seconds)

## Important Notes

⚠️ **Use Responsibly**:
- Instagram has rate limits and may temporarily block accounts that like too many posts
- Use at your own risk
- Consider Instagram's Terms of Service
- Don't run multiple instances simultaneously
- The bot includes built-in delays (2s between likes, 10-12s between hashtags) to avoid rate limiting
- Start with fewer hashtags and posts to test your account limits

## How It Works

1. **Browser Launch**: Starts Chrome with anti-detection settings
2. **Login**: Logs into Instagram with retry logic (up to 3 attempts)
   - Handles cookie consent popups
   - Dismisses "Save Login Info" and "Notifications" prompts
3. **Hashtag Processing**: Cycles through each hashtag in your list
   - Navigates to hashtag search page
   - Extracts configured number of recent post URLs
4. **Like Posts**: For each post:
   - Opens the post page
   - Checks if already liked (skips if true)
   - Clicks the main like button (distinguishes from comment like buttons by SVG height)
   - Verifies the like was successful
   - Waits 2 seconds before next post
5. **Hashtag Pause**: Waits 10-12 seconds (randomized) before moving to next hashtag
6. **Statistics**: Displays per-hashtag and total statistics
7. **Cycle Wait**: Waits 3 minutes before repeating the entire process
8. **Error Recovery**: Automatically retries on errors with 30-second delay

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║           Instagram Auto Liker Bot                         ║
╠════════════════════════════════════════════════════════════╣
║  Username:  yourusername                                   ║
║  Hashtags:  5 hashtags                                     ║
║  Posts/tag: 9                                              ║
║  Interval:  Every 3 minutes                                ║
╚════════════════════════════════════════════════════════════╝

============================================================
Starting like cycle at 1/15/2025, 3:45:20 PM
============================================================

[1/5] Processing #lithuania...
Navigating to #lithuania...
Found 9 recent posts
  Post 1/9:
  ✓ Clicked like button
  ✓ Like verified: https://www.instagram.com/p/ABC123/
  Post 2/9:
  → Already liked: https://www.instagram.com/p/DEF456/
  ...

  #lithuania: ✓ 7 liked, → 2 already liked, ✗ 0 failed
  Pausing for 11.3s before next hashtag...

[2/5] Processing #vilnius...
...

============================================================
TOTAL: ✓ 32 liked, → 13 already liked, ✗ 0 failed
============================================================

Waiting 3 minutes before next cycle...
Next cycle at: 1/15/2025, 3:48:20 PM
```

## Troubleshooting

**Browser doesn't start:**
- Make sure Chrome is installed at the path specified in `CHROME_PATH`
- On Mac: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- On Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- Try setting the correct path in your `.env` file

**Login fails:**
- Check your username and password in `.env`
- Instagram may require verification (check your email/phone)
- Try logging in manually in Chrome first to clear any verification steps
- Check console output for specific error messages

**Can't find posts:**
- The hashtag might be empty, private, or blocked
- Try a different, more popular hashtag
- Check if you're logged in properly (watch the browser window)
- Instagram may have rate limited your account

**Like button not clicking:**
- Instagram may have changed their UI
- Check the browser window to see what's happening
- The bot logs detailed information about each action

**Account gets rate limited:**
- Reduce `POSTS_PER_HASHTAG` to a lower number (e.g., 4-5)
- Reduce the number of hashtags
- Increase delays in the `Config` object
- Wait 24 hours before trying again

## License

MIT