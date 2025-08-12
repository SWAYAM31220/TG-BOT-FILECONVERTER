require('dotenv').config();
const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
const admin = require('firebase-admin');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_URL
});
const db = admin.firestore();

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Create temp directory for file processing
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Import modules
const userService = require('./services/userService');
const mediaService = require('./services/mediaService');
const commandHandlers = require('./handlers/commandHandlers');
const mediaHandlers = require('./handlers/mediaHandlers');

// Middleware
bot.use(session());

// Command handlers
bot.command('start', commandHandlers.startHandler);
bot.command('help', commandHandlers.helpHandler);
bot.command('credits', commandHandlers.creditsHandler);
bot.command('buy', commandHandlers.buyHandler);
bot.command('refer', commandHandlers.referHandler);

// Admin commands
bot.command('stats', commandHandlers.statsHandler);
bot.command('addcredits', commandHandlers.addCreditsHandler);
bot.command('reset', commandHandlers.resetHandler);

// Media handlers
bot.on(message('video'), mediaHandlers.videoHandler);
bot.on(message('audio'), mediaHandlers.audioHandler);
bot.on(message('document'), mediaHandlers.documentHandler);

// Action handlers for inline buttons
bot.action(/convert_(.+)/, mediaHandlers.convertHandler);

// Schedule cleanup job to delete old files from storage channel
schedule.scheduleJob('0 * * * *', async () => {
  try {
    console.log('Running cleanup job...');
    // Logic to delete files older than FILE_DELETE_AFTER_HOURS from storage channel
    // Will be implemented in mediaService
    await mediaService.cleanupOldFiles();
  } catch (error) {
    console.error('Error in cleanup job:', error);
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('An error occurred while processing your request. Please try again later.');
});

// Start bot
bot.launch().then(() => {
  console.log('Bot started successfully!');
}).catch(err => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));