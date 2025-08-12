const admin = require('firebase-admin');
const db = admin.firestore();
const usersRef = db.collection('users');

/**
 * Get user data from database or create new user if not exists
 * @param {number} userId - Telegram user ID
 * @param {Object} userData - Additional user data
 * @returns {Promise<Object>} User data
 */
async function getOrCreateUser(userId, userData = {}) {
  const userDoc = await usersRef.doc(String(userId)).get();
  
  if (userDoc.exists) {
    // Update last activity
    await usersRef.doc(String(userId)).update({
      last_activity: admin.firestore.FieldValue.serverTimestamp()
    });
    return { id: userDoc.id, ...userDoc.data() };
  } else {
    // Create new user
    const newUser = {
      user_id: userId,
      credits: 10, // Initial free credits
      referrals: 0,
      usage_count: 0,
      last_activity: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      ...userData
    };
    
    await usersRef.doc(String(userId)).set(newUser);
    return { id: String(userId), ...newUser };
  }
}

/**
 * Update user credits
 * @param {number} userId - Telegram user ID
 * @param {number} amount - Amount to add (positive) or deduct (negative)
 * @returns {Promise<number>} New credit balance
 */
async function updateCredits(userId, amount) {
  const userRef = usersRef.doc(String(userId));
  
  return db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const newCredits = userData.credits + amount;
    
    if (newCredits < 0) {
      throw new Error('Insufficient credits');
    }
    
    transaction.update(userRef, { 
      credits: newCredits,
      last_activity: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return newCredits;
  });
}

/**
 * Process referral when a new user joins
 * @param {number} referrerId - Referrer user ID
 * @param {number} newUserId - New user ID
 * @returns {Promise<boolean>} Success status
 */
async function processReferral(referrerId, newUserId) {
  if (!referrerId || referrerId === newUserId) {
    return false;
  }
  
  const referrerRef = usersRef.doc(String(referrerId));
  const referrerDoc = await referrerRef.get();
  
  if (!referrerDoc.exists) {
    return false;
  }
  
  // Update referrer's data
  await referrerRef.update({
    referrals: admin.firestore.FieldValue.increment(1),
    credits: admin.firestore.FieldValue.increment(parseInt(process.env.REFERRAL_BONUS)),
    last_activity: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return true;
}

/**
 * Check if user has reached daily conversion limit
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} True if limit reached
 */
async function checkDailyLimit(userId) {
  const userRef = usersRef.doc(String(userId));
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    return false;
  }
  
  const userData = userDoc.data();
  
  // Get today's conversions
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const conversionsRef = db.collection('conversions');
  const todayConversions = await conversionsRef
    .where('user_id', '==', userId)
    .where('created_at', '>=', today)
    .get();
  
  return todayConversions.size >= parseInt(process.env.DAILY_LIMIT);
}

/**
 * Get user statistics for admin
 * @returns {Promise<Object>} Statistics object
 */
async function getStats() {
  const usersSnapshot = await usersRef.get();
  const totalUsers = usersSnapshot.size;
  
  const conversionsRef = db.collection('conversions');
  const conversionsSnapshot = await conversionsRef.get();
  const totalConversions = conversionsSnapshot.size;
  
  // Get active users (active in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeUsersSnapshot = await usersRef
    .where('last_activity', '>=', sevenDaysAgo)
    .get();
  const activeUsers = activeUsersSnapshot.size;
  
  return {
    totalUsers,
    activeUsers,
    totalConversions
  };
}

/**
 * Reset user data
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} Success status
 */
async function resetUser(userId) {
  const userRef = usersRef.doc(String(userId));
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    return false;
  }
  
  await userRef.update({
    credits: 10,
    referrals: 0,
    usage_count: 0,
    last_activity: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return true;
}

module.exports = {
  getOrCreateUser,
  updateCredits,
  processReferral,
  checkDailyLimit,
  getStats,
  resetUser
};