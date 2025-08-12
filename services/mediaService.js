const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');
const admin = require('firebase-admin');
const db = admin.firestore();
const conversionsRef = db.collection('conversions');
const { Telegraf } = require('telegraf');

// Initialize bot for storage channel operations
const bot = new Telegraf(process.env.BOT_TOKEN);

// Temp directory for file processing
const tempDir = path.join(__dirname, '..', 'temp');

/**
 * Download file from Telegram
 * @param {Object} ctx - Telegram context
 * @param {string} fileId - Telegram file ID
 * @returns {Promise<string>} Path to downloaded file
 */
async function downloadFile(ctx, fileId) {
  try {
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const filePath = path.join(tempDir, fileName);
    
    // Download file using Telegraf's getFileLink
    const response = await fetch(fileLink.href);
    const fileStream = fs.createWriteStream(filePath);
    
    return new Promise((resolve, reject) => {
      const stream = Readable.fromWeb(response.body);
      stream.pipe(fileStream);
      fileStream.on('finish', () => resolve(filePath));
      fileStream.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Get available conversion formats based on file type
 * @param {string} fileType - Type of file (video, audio)
 * @returns {Object[]} Array of format objects with label and value
 */
function getAvailableFormats(fileType) {
  if (fileType === 'video') {
    return [
      { label: '360p', value: '360p' },
      { label: '480p', value: '480p' },
      { label: '720p', value: '720p' },
      { label: '1080p', value: '1080p' },
      { label: 'Extract MP3', value: 'mp3' }
    ];
  } else if (fileType === 'audio') {
    return [
      { label: 'MP3', value: 'mp3' },
      { label: 'WAV', value: 'wav' },
      { label: 'OGG', value: 'ogg' }
    ];
  }
  
  return [];
}

/**
 * Convert video file to specified format
 * @param {string} inputPath - Path to input file
 * @param {string} format - Target format
 * @returns {Promise<string>} Path to converted file
 */
async function convertVideo(inputPath, format) {
  const outputFileName = `${path.basename(inputPath, path.extname(inputPath))}_${format}${format === 'mp3' ? '.mp3' : '.mp4'}`;
  const outputPath = path.join(tempDir, outputFileName);
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);
    
    if (format === 'mp3') {
      // Extract audio
      command
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate(192)
        .format('mp3');
    } else {
      // Convert video resolution
      const height = parseInt(format.replace('p', ''));
      const width = Math.floor(height * 16 / 9); // Assuming 16:9 aspect ratio
      
      command
        .videoCodec('libx264')
        .size(`${width}x${height}`)
        .audioCodec('aac')
        .audioBitrate(128)
        .format('mp4');
    }
    
    command
      .on('error', (err) => {
        console.error('Error converting video:', err);
        reject(new Error('Failed to convert video'));
      })
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Convert audio file to specified format
 * @param {string} inputPath - Path to input file
 * @param {string} format - Target format
 * @returns {Promise<string>} Path to converted file
 */
async function convertAudio(inputPath, format) {
  const outputFileName = `${path.basename(inputPath, path.extname(inputPath))}.${format}`;
  const outputPath = path.join(tempDir, outputFileName);
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath);
    
    switch (format) {
      case 'mp3':
        command.audioCodec('libmp3lame').audioBitrate(192);
        break;
      case 'wav':
        command.audioCodec('pcm_s16le');
        break;
      case 'ogg':
        command.audioCodec('libvorbis').audioBitrate(192);
        break;
      default:
        reject(new Error('Unsupported format'));
        return;
    }
    
    command
      .format(format)
      .on('error', (err) => {
        console.error('Error converting audio:', err);
        reject(new Error('Failed to convert audio'));
      })
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

/**
 * Upload file to storage channel
 * @param {string} filePath - Path to file
 * @param {string} caption - Caption for the file
 * @returns {Promise<Object>} Message object with file_id
 */
async function uploadToStorageChannel(filePath, caption) {
  try {
    const storageChannelId = process.env.STORAGE_CHANNEL_ID;
    const fileExt = path.extname(filePath).toLowerCase();
    let message;
    
    if (['.mp4', '.avi', '.mov', '.mkv'].includes(fileExt)) {
      // Upload as video
      message = await bot.telegram.sendVideo(
        storageChannelId,
        { source: filePath },
        { caption }
      );
    } else if (['.mp3', '.wav', '.ogg'].includes(fileExt)) {
      // Upload as audio
      message = await bot.telegram.sendAudio(
        storageChannelId,
        { source: filePath },
        { caption }
      );
    } else {
      // Upload as document
      message = await bot.telegram.sendDocument(
        storageChannelId,
        { source: filePath },
        { caption }
      );
    }
    
    // Store message info in database for later cleanup
    await conversionsRef.add({
      message_id: message.message_id,
      chat_id: storageChannelId,
      file_id: message.video?.file_id || message.audio?.file_id || message.document?.file_id,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: new Date(Date.now() + parseInt(process.env.FILE_DELETE_AFTER_HOURS) * 60 * 60 * 1000)
    });
    
    return message;
  } catch (error) {
    console.error('Error uploading to storage channel:', error);
    throw new Error('Failed to upload file to storage');
  }
}

/**
 * Clean up old files from storage channel
 * @returns {Promise<number>} Number of deleted files
 */
async function cleanupOldFiles() {
  try {
    const now = new Date();
    
    // Get expired files
    const expiredFilesSnapshot = await conversionsRef
      .where('expires_at', '<=', now)
      .get();
    
    if (expiredFilesSnapshot.empty) {
      return 0;
    }
    
    // Delete files from storage channel
    const deletePromises = [];
    expiredFilesSnapshot.forEach(doc => {
      const data = doc.data();
      deletePromises.push(
        bot.telegram.deleteMessage(data.chat_id, data.message_id)
          .catch(err => console.error(`Failed to delete message ${data.message_id}:`, err))
      );
      deletePromises.push(conversionsRef.doc(doc.id).delete());
    });
    
    await Promise.all(deletePromises);
    return expiredFilesSnapshot.size;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    throw error;
  }
}

/**
 * Clean up temporary files
 * @param {string[]} filePaths - Array of file paths to delete
 */
function cleanupTempFiles(filePaths) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Error deleting temp file ${filePath}:`, error);
    }
  }
}

module.exports = {
  downloadFile,
  getAvailableFormats,
  convertVideo,
  convertAudio,
  uploadToStorageChannel,
  cleanupOldFiles,
  cleanupTempFiles
};