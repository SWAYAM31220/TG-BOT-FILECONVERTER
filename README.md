# Telegram Media Converter Bot with Credits System

A Telegram bot that allows users to convert media files (video/audio) to different formats using a credits system.

## Features

- **Media Conversion**: Convert videos to different resolutions (360p, 480p, 720p, 1080p) or extract MP3 audio. Convert audio files to MP3, WAV, or OGG formats.
- **Credits System**: Users get free credits upon joining and can earn more through referrals.
- **Referral System**: Users can invite friends to earn bonus credits.
- **Admin Commands**: Monitor bot usage, manage user credits, and reset user data.
- **Temporary Storage**: Files are stored in a private Telegram channel and auto-deleted after a configurable time period.

## Commands

- `/start` - Shows welcome message, credits balance, and usage instructions
- `/help` - Shows all available commands
- `/credits` - Shows remaining credits
- `/buy` - Shows how to buy more credits
- `/refer` - Gives referral link (on joining via link, referrer gets bonus credits)

### Admin Commands

- `/stats` - Show total users, total conversions, storage usage
- `/addcredits <user_id> <amount>` - Add credits manually
- `/reset <user_id>` - Reset a user's data

## Setup

### Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on your system
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Firebase account (free tier)

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/telegram-media-converter-bot.git
   cd telegram-media-converter-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   BOT_TOKEN=your_telegram_bot_token
   FIREBASE_URL=https://your-firebase-url.firebaseio.com
   FIREBASE_KEY=your_firebase_secret
   STORAGE_CHANNEL_ID=-100xxxxxxxxxx
   ADMIN_ID=123456789
   CREDIT_PER_CONVERSION=1
   REFERRAL_BONUS=5
   MAX_FILE_SIZE_MB=20
   FILE_DELETE_AFTER_HOURS=2
   DAILY_LIMIT=20
   ```

4. Create a private Telegram channel and add your bot as an administrator with permission to post messages.

5. Start the bot:
   ```
   npm start
   ```

## Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Set up Firestore database
3. Generate a new private key in Project Settings > Service Accounts
4. Convert the downloaded JSON key to a string and use it as FIREBASE_KEY in your .env file

## Deployment

This bot can be deployed to various platforms:

- **Replit**: Import the GitHub repository and set up environment variables
- **Railway**: Connect to your GitHub repository and configure environment variables
- **Render**: Set up a new Web Service pointing to your repository

## License

MIT