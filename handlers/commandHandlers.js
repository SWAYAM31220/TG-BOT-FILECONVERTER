const userService = require('../services/userService');

/**
 * Handle /start command
 * @param {Object} ctx - Telegram context
 */
async function startHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || '';
    
    // Check if this is a referral
    let referrerId = null;
    const startPayload = ctx.startPayload;
    if (startPayload && startPayload.startsWith('ref_')) {
      referrerId = parseInt(startPayload.replace('ref_', ''));
    }
    
    // Get or create user
    const user = await userService.getOrCreateUser(userId, {
      username,
      referrer_id: referrerId
    });
    
    // Process referral if this is a new user
    if (referrerId && user.created_at) {
      await userService.processReferral(referrerId, userId);
    }
    
    // Send welcome message
    await ctx.reply(
      `👋 Welcome to Media Converter Bot!\n\n` +
      `This bot was devloped by @regnis. \n\n` +
      `You have ${user.credits} credits available.\n\n` +
      `How to use:\n` +
      `1. Send me any video or audio file (up to ${process.env.MAX_FILE_SIZE_MB}MB)\n` +
      `2. Choose your desired conversion format\n` +
      `3. Wait for the conversion to complete\n\n` +
      `Each conversion costs ${process.env.CREDIT_PER_CONVERSION} credit.\n` +
      `Use /help to see all available commands.`
    );
  } catch (error) {
    console.error('Error in start handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle /help command
 * @param {Object} ctx - Telegram context
 */
async function helpHandler(ctx) {
  await ctx.reply(
    `📋 Available Commands:\n\n` +
    `/start - Start the bot and see welcome message\n` +
    `/help - Show this help message\n` +
    `/credits - Check your remaining credits\n` +
    `/buy - Learn how to buy more credits\n` +
    `/refer - Get your referral link to earn free credits\n\n` +
    `Simply send me any video or audio file to start converting!`
  );
}

/**
 * Handle /credits command
 * @param {Object} ctx - Telegram context
 */
async function creditsHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const user = await userService.getOrCreateUser(userId);
    
    await ctx.reply(
      `💰 Credits Balance: ${user.credits}\n\n` +
      `Each conversion costs ${process.env.CREDIT_PER_CONVERSION} credit.\n` +
      `Use /buy to purchase more credits or /refer to earn free credits by inviting friends.`
    );
  } catch (error) {
    console.error('Error in credits handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle /buy command
 * @param {Object} ctx - Telegram context
 */
async function buyHandler(ctx) {
  await ctx.reply(
    `💳 Buy More Credits\n\n` +
    `To purchase more credits, please contact our administrator at @admin_username.\n\n` +
    `Available packages:\n` +
    `• 50 credits - $5\n` +
    `• 120 credits - $10\n` +
    `• 300 credits - $20\n\n` +
    `After payment, your credits will be added to your account immediately.`
  );
}

/**
 * Handle /refer command
 * @param {Object} ctx - Telegram context
 */
async function referHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const botUsername = ctx.botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    
    await ctx.reply(
      `🔗 Your Referral Link\n\n` +
      `Share this link with your friends and earn ${process.env.REFERRAL_BONUS} free credits for each new user who joins!\n\n` +
      `${referralLink}\n\n` +
      `You've invited ${(await userService.getOrCreateUser(userId)).referrals} users so far.`
    );
  } catch (error) {
    console.error('Error in refer handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle /stats command (admin only)
 * @param {Object} ctx - Telegram context
 */
async function statsHandler(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user is admin
    if (userId != process.env.ADMIN_ID) {
      return ctx.reply('You do not have permission to use this command.');
    }
    
    const stats = await userService.getStats();
    
    await ctx.reply(
      `📊 Bot Statistics\n\n` +
      `Total Users: ${stats.totalUsers}\n` +
      `Active Users (7d): ${stats.activeUsers}\n` +
      `Total Conversions: ${stats.totalConversions}\n`
    );
  } catch (error) {
    console.error('Error in stats handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle /addcredits command (admin only)
 * @param {Object} ctx - Telegram context
 */
async function addCreditsHandler(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user is admin
    if (userId != process.env.ADMIN_ID) {
      return ctx.reply('You do not have permission to use this command.');
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length !== 3) {
      return ctx.reply('Usage: /addcredits <user_id> <amount>');
    }
    
    const targetUserId = parseInt(args[1]);
    const amount = parseInt(args[2]);
    
    if (isNaN(targetUserId) || isNaN(amount)) {
      return ctx.reply('Invalid user ID or amount. Please use numbers only.');
    }
    
    const newBalance = await userService.updateCredits(targetUserId, amount);
    
    await ctx.reply(`Credits updated successfully. New balance for user ${targetUserId}: ${newBalance}`);
  } catch (error) {
    console.error('Error in add credits handler:', error);
    await ctx.reply(`Error: ${error.message}`);
  }
}

/**
 * Handle /reset command (admin only)
 * @param {Object} ctx - Telegram context
 */
async function resetHandler(ctx) {
  try {
    const userId = ctx.from.id;
    
    // Check if user is admin
    if (userId != process.env.ADMIN_ID) {
      return ctx.reply('You do not have permission to use this command.');
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length !== 2) {
      return ctx.reply('Usage: /reset <user_id>');
    }
    
    const targetUserId = parseInt(args[1]);
    
    if (isNaN(targetUserId)) {
      return ctx.reply('Invalid user ID. Please use numbers only.');
    }
    
    const success = await userService.resetUser(targetUserId);
    
    if (success) {
      await ctx.reply(`User ${targetUserId} has been reset successfully.`);
    } else {
      await ctx.reply(`User ${targetUserId} not found.`);
    }
  } catch (error) {
    console.error('Error in reset handler:', error);
    await ctx.reply(`Error: ${error.message}`);
  }
}

module.exports = {
  startHandler,
  helpHandler,
  creditsHandler,
  buyHandler,
  referHandler,
  statsHandler,
  addCreditsHandler,
  resetHandler
};