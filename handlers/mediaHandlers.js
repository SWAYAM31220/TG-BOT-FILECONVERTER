const { Markup } = require('telegraf');
const userService = require('../services/userService');
const mediaService = require('../services/mediaService');
const admin = require('firebase-admin');
const db = admin.firestore();
const conversionsRef = db.collection('conversions');

/**
 * Check if file size is within limits
 * @param {number} fileSize - File size in bytes
 * @returns {boolean} True if file is within limits
 */
function isFileSizeValid(fileSize) {
  const maxSizeBytes = parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024;
  return fileSize <= maxSizeBytes;
}

/**
 * Handle video file uploads
 * @param {Object} ctx - Telegram context
 */
async function videoHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const user = await userService.getOrCreateUser(userId);
    
    // Check if user has credits
    if (user.credits < parseInt(process.env.CREDIT_PER_CONVERSION)) {
      return ctx.reply(
        '❌ You don\'t have enough credits for conversion.\n\n' +
        'Use /buy to purchase more credits or /refer to earn free credits.'
      );
    }
    
    // Check daily limit
    if (await userService.checkDailyLimit(userId)) {
      return ctx.reply(
        `❌ You've reached the daily limit of ${process.env.DAILY_LIMIT} conversions.\n\n` +
        'Please try again tomorrow.'
      );
    }
    
    // Check file size
    const fileSize = ctx.message.video.file_size;
    if (!isFileSizeValid(fileSize)) {
      return ctx.reply(
        `❌ File too large. Maximum file size is ${process.env.MAX_FILE_SIZE_MB}MB.\n\n` +
        'Please upload a smaller file or upgrade.'
      );
    }
    
    // Store file info in session
    ctx.session = ctx.session || {};
    ctx.session.fileInfo = {
      fileId: ctx.message.video.file_id,
      fileType: 'video',
      fileName: ctx.message.video.file_name || `video_${Date.now()}.mp4`,
      fileSize: fileSize
    };
    
    // Show available formats
    const formats = mediaService.getAvailableFormats('video');
    const buttons = formats.map(format => [
      Markup.button.callback(format.label, `convert_${format.value}`)
    ]);
    
    await ctx.reply(
      '🎬 Please select the conversion format:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error('Error in video handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle audio file uploads
 * @param {Object} ctx - Telegram context
 */
async function audioHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const user = await userService.getOrCreateUser(userId);
    
    // Check if user has credits
    if (user.credits < parseInt(process.env.CREDIT_PER_CONVERSION)) {
      return ctx.reply(
        '❌ You don\'t have enough credits for conversion.\n\n' +
        'Use /buy to purchase more credits or /refer to earn free credits.'
      );
    }
    
    // Check daily limit
    if (await userService.checkDailyLimit(userId)) {
      return ctx.reply(
        `❌ You've reached the daily limit of ${process.env.DAILY_LIMIT} conversions.\n\n` +
        'Please try again tomorrow.'
      );
    }
    
    // Check file size
    const fileSize = ctx.message.audio.file_size;
    if (!isFileSizeValid(fileSize)) {
      return ctx.reply(
        `❌ File too large. Maximum file size is ${process.env.MAX_FILE_SIZE_MB}MB.\n\n` +
        'Please upload a smaller file or upgrade.'
      );
    }
    
    // Store file info in session
    ctx.session = ctx.session || {};
    ctx.session.fileInfo = {
      fileId: ctx.message.audio.file_id,
      fileType: 'audio',
      fileName: ctx.message.audio.file_name || `audio_${Date.now()}.mp3`,
      fileSize: fileSize
    };
    
    // Show available formats
    const formats = mediaService.getAvailableFormats('audio');
    const buttons = formats.map(format => [
      Markup.button.callback(format.label, `convert_${format.value}`)
    ]);
    
    await ctx.reply(
      '🎵 Please select the conversion format:',
      Markup.inlineKeyboard(buttons)
    );
  } catch (error) {
    console.error('Error in audio handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle document file uploads (check if it's media)
 * @param {Object} ctx - Telegram context
 */
async function documentHandler(ctx) {
  try {
    const document = ctx.message.document;
    const mimeType = document.mime_type || '';
    
    // Check if document is a media file
    if (mimeType.startsWith('video/')) {
      // Handle as video
      const userId = ctx.from.id;
      const user = await userService.getOrCreateUser(userId);
      
      // Check if user has credits
      if (user.credits < parseInt(process.env.CREDIT_PER_CONVERSION)) {
        return ctx.reply(
          '❌ You don\'t have enough credits for conversion.\n\n' +
          'Use /buy to purchase more credits or /refer to earn free credits.'
        );
      }
      
      // Check daily limit
      if (await userService.checkDailyLimit(userId)) {
        return ctx.reply(
          `❌ You've reached the daily limit of ${process.env.DAILY_LIMIT} conversions.\n\n` +
          'Please try again tomorrow.'
        );
      }
      
      // Check file size
      const fileSize = document.file_size;
      if (!isFileSizeValid(fileSize)) {
        return ctx.reply(
          `❌ File too large. Maximum file size is ${process.env.MAX_FILE_SIZE_MB}MB.\n\n` +
          'Please upload a smaller file or upgrade.'
        );
      }
      
      // Store file info in session
      ctx.session = ctx.session || {};
      ctx.session.fileInfo = {
        fileId: document.file_id,
        fileType: 'video',
        fileName: document.file_name || `video_${Date.now()}.mp4`,
        fileSize: fileSize
      };
      
      // Show available formats
      const formats = mediaService.getAvailableFormats('video');
      const buttons = formats.map(format => [
        Markup.button.callback(format.label, `convert_${format.value}`)
      ]);
      
      await ctx.reply(
        '🎬 Please select the conversion format:',
        Markup.inlineKeyboard(buttons)
      );
    } else if (mimeType.startsWith('audio/')) {
      // Handle as audio
      const userId = ctx.from.id;
      const user = await userService.getOrCreateUser(userId);
      
      // Check if user has credits
      if (user.credits < parseInt(process.env.CREDIT_PER_CONVERSION)) {
        return ctx.reply(
          '❌ You don\'t have enough credits for conversion.\n\n' +
          'Use /buy to purchase more credits or /refer to earn free credits.'
        );
      }
      
      // Check daily limit
      if (await userService.checkDailyLimit(userId)) {
        return ctx.reply(
          `❌ You've reached the daily limit of ${process.env.DAILY_LIMIT} conversions.\n\n` +
          'Please try again tomorrow.'
        );
      }
      
      // Check file size
      const fileSize = document.file_size;
      if (!isFileSizeValid(fileSize)) {
        return ctx.reply(
          `❌ File too large. Maximum file size is ${process.env.MAX_FILE_SIZE_MB}MB.\n\n` +
          'Please upload a smaller file or upgrade.'
        );
      }
      
      // Store file info in session
      ctx.session = ctx.session || {};
      ctx.session.fileInfo = {
        fileId: document.file_id,
        fileType: 'audio',
        fileName: document.file_name || `audio_${Date.now()}.mp3`,
        fileSize: fileSize
      };
      
      // Show available formats
      const formats = mediaService.getAvailableFormats('audio');
      const buttons = formats.map(format => [
        Markup.button.callback(format.label, `convert_${format.value}`)
      ]);
      
      await ctx.reply(
        '🎵 Please select the conversion format:',
        Markup.inlineKeyboard(buttons)
      );
    } else {
      // Not a supported media file
      await ctx.reply(
        '❌ Unsupported file type.\n\n' +
        'Please upload a video or audio file.'
      );
    }
  } catch (error) {
    console.error('Error in document handler:', error);
    await ctx.reply('An error occurred. Please try again later.');
  }
}

/**
 * Handle conversion action (when user selects format)
 * @param {Object} ctx - Telegram context
 */
async function convertHandler(ctx) {
  try {
    const userId = ctx.from.id;
    const user = await userService.getOrCreateUser(userId);
    
    // Check if session exists
    if (!ctx.session || !ctx.session.fileInfo) {
      return ctx.reply(
        '❌ Session expired. Please upload your file again.'
      );
    }
    
    // Get selected format
    const format = ctx.match[1];
    const fileInfo = ctx.session.fileInfo;
    
    // Send processing message
    const processingMsg = await ctx.reply('⏳ Processing your file...');
    
    // Download file
    const downloadedFilePath = await mediaService.downloadFile(ctx, fileInfo.fileId);
    
    // Convert file
    let convertedFilePath;
    if (fileInfo.fileType === 'video') {
      convertedFilePath = await mediaService.convertVideo(downloadedFilePath, format);
    } else if (fileInfo.fileType === 'audio') {
      convertedFilePath = await mediaService.convertAudio(downloadedFilePath, format);
    } else {
      throw new Error('Unsupported file type');
    }
    
    // Upload to storage channel
    const caption = `Converted by user ${userId} | Format: ${format}`;
    const message = await mediaService.uploadToStorageChannel(convertedFilePath, caption);
    
    // Deduct credits
    await userService.updateCredits(userId, -parseInt(process.env.CREDIT_PER_CONVERSION));
    
    // Update usage count
    await db.collection('users').doc(String(userId)).update({
      usage_count: admin.firestore.FieldValue.increment(1)
    });
    
    // Log conversion
    await conversionsRef.add({
      user_id: userId,
      original_file_id: fileInfo.fileId,
      converted_file_id: message.video?.file_id || message.audio?.file_id || message.document?.file_id,
      format: format,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Delete processing message
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    // Send converted file to user
    if (fileInfo.fileType === 'video' && format !== 'mp3') {
      await ctx.replyWithVideo(message.video.file_id, {
        caption: `✅ Converted to ${format}\n\nRemaining credits: ${await userService.updateCredits(userId, 0)}`
      });
    } else if (fileInfo.fileType === 'video' && format === 'mp3' || fileInfo.fileType === 'audio') {
      await ctx.replyWithAudio(message.audio.file_id, {
        caption: `✅ Converted to ${format}\n\nRemaining credits: ${await userService.updateCredits(userId, 0)}`
      });
    } else {
      await ctx.replyWithDocument(message.document.file_id, {
        caption: `✅ Converted to ${format}\n\nRemaining credits: ${await userService.updateCredits(userId, 0)}`
      });
    }
    
    // Clean up temp files
    mediaService.cleanupTempFiles([downloadedFilePath, convertedFilePath]);
    
    // Clear session
    delete ctx.session.fileInfo;
  } catch (error) {
    console.error('Error in convert handler:', error);
    await ctx.reply('❌ Conversion failed. Please try again later.');
  }
}

module.exports = {
  videoHandler,
  audioHandler,
  documentHandler,
  convertHandler
};