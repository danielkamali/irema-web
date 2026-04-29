/**
 * Cloud Function: Calculate Analytics Metrics Daily
 * Triggered daily at 2 AM
 * Calculates and stores pre-computed analytics metrics for all companies
 * Deploy: firebase deploy --only functions -P production
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Metrics calculation functions (import from shared utility if possible, or inline)
function calculateBasicMetrics(reviews = []) {
  const totalReviews = reviews.length;
  if (totalReviews === 0) {
    return {
      avgRating: 0,
      totalReviews: 0,
      responseRate: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      reviewCountThisMonth: 0,
    };
  }

  const sumRatings = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
  const avgRating = parseFloat((sumRatings / totalReviews).toFixed(2));

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingDistribution[Math.round(r.rating)]++;
    }
  });

  const responded = reviews.filter(r => (r.replies || []).length > 0).length;
  const responseRate = parseFloat(((responded / totalReviews) * 100).toFixed(2));

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const reviewCountThisMonth = reviews.filter(r => {
    const reviewDate = r.createdAt?.toMillis?.() || 0;
    return reviewDate > thirtyDaysAgo;
  }).length;

  return {
    avgRating,
    totalReviews,
    responseRate,
    ratingDistribution,
    reviewCountThisMonth,
  };
}

function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { sentiment: 'neutral', score: 50 };
  }

  const POSITIVE_KEYWORDS = [
    'great',
    'excellent',
    'amazing',
    'awesome',
    'fantastic',
    'wonderful',
    'good',
    'nice',
    'love',
    'best',
    'perfect',
    'recommend',
    'impressed',
    'satisfied',
    'happy',
    'friendly',
    'helpful',
  ];
  const NEGATIVE_KEYWORDS = [
    'bad',
    'terrible',
    'awful',
    'horrible',
    'poor',
    'worst',
    'hate',
    'disappointed',
    'disappointing',
    'rude',
    'unprofessional',
    'slow',
    'overpriced',
    'expensive',
    'dirty',
    'broken',
  ];

  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  POSITIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });

  NEGATIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });

  let sentiment = 'neutral';
  let score = 50;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    const diff = positiveCount - negativeCount;
    score = Math.min(100, 50 + diff * 10);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    const diff = negativeCount - positiveCount;
    score = Math.max(0, 50 - diff * 10);
  }

  return { sentiment, score: Math.round(score) };
}

function calculateSentimentScore(reviews = []) {
  if (!reviews || reviews.length === 0) {
    return {
      overallScore: 50,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      positivePercentage: 0,
      negativePercentage: 0,
      neutralPercentage: 0,
    };
  }

  let totalScore = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  reviews.forEach(review => {
    const analysis = analyzeSentiment(review.comment || '');
    totalScore += analysis.score;

    if (analysis.sentiment === 'positive') positiveCount++;
    else if (analysis.sentiment === 'negative') negativeCount++;
    else neutralCount++;
  });

  const overallScore = Math.round(totalScore / reviews.length);
  const total = reviews.length;

  return {
    overallScore,
    positiveCount,
    negativeCount,
    neutralCount,
    positivePercentage: Math.round((positiveCount / total) * 100),
    negativePercentage: Math.round((negativeCount / total) * 100),
    neutralPercentage: Math.round((neutralCount / total) * 100),
  };
}

function calculateTrendMetrics(reviews = []) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

  const lastMonthReviews = reviews.filter(r => {
    const reviewDate = r.createdAt?.toMillis?.() || 0;
    return reviewDate > thirtyDaysAgo;
  });

  const lastTwoMonthsReviews = reviews.filter(r => {
    const reviewDate = r.createdAt?.toMillis?.() || 0;
    return reviewDate > sixtyDaysAgo;
  });

  const previousMonthCount = lastTwoMonthsReviews.length - lastMonthReviews.length;
  const currentMonthCount = lastMonthReviews.length;

  const growthRate =
    previousMonthCount === 0
      ? currentMonthCount > 0
        ? 100
        : 0
      : parseFloat(
          (((currentMonthCount - previousMonthCount) / previousMonthCount) * 100).toFixed(2)
        );

  return {
    currentMonthCount,
    previousMonthCount,
    growthRate,
  };
}

/**
 * Main function: Calculate metrics for all companies
 */
exports.calculateAnalyticsMetrics = onSchedule(
  {
    schedule: 'every day 02:00', // Daily at 2 AM
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB',
    region: 'us-central1',
  },
  async context => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    console.log(`Starting analytics metrics calculation for ${dateString}`);

    try {
      // Fetch all companies
      const companiesSnapshot = await db.collection('companies').get();
      const companies = companiesSnapshot.docs;

      console.log(`Processing ${companies.length} companies`);

      let successCount = 0;
      let errorCount = 0;

      for (const companyDoc of companies) {
        try {
          const company = companyDoc.data();
          const companyId = companyDoc.id;

          // Fetch all reviews for this company
          const reviewsSnapshot = await db
            .collection('reviews')
            .where('companyId', '==', companyId)
            .get();

          const reviews = reviewsSnapshot.docs.map(d => d.data());

          // Calculate metrics
          const basicMetrics = calculateBasicMetrics(reviews);
          const sentimentMetrics = calculateSentimentScore(reviews);
          const trendMetrics = calculateTrendMetrics(reviews);

          // Store in analytics_metrics collection
          const metricsData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            date: dateString,
            companyId,
            companyName: company.companyName || company.name,
            category: company.category,
            totalReviews: basicMetrics.totalReviews,
            avgRating: basicMetrics.avgRating,
            responseRate: basicMetrics.responseRate,
            reviewCountThisMonth: basicMetrics.reviewCountThisMonth,
            ratingDistribution: basicMetrics.ratingDistribution,
            sentimentScore: sentimentMetrics.overallScore,
            positivePercentage: sentimentMetrics.positivePercentage,
            negativePercentage: sentimentMetrics.negativePercentage,
            neutralPercentage: sentimentMetrics.neutralPercentage,
            growthRate: trendMetrics.growthRate,
            currentMonthCount: trendMetrics.currentMonthCount,
            previousMonthCount: trendMetrics.previousMonthCount,
            dataPoints: reviews.length,
            calculatedAt: new Date().toISOString(),
          };

          // Store as daily snapshot
          await db.collection('analytics_metrics').doc(companyId).collection('daily').doc(dateString).set(metricsData);

          // Also update the latest snapshot
          await db.collection('analytics_metrics').doc(companyId).set(
            {
              latest: metricsData,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          successCount++;
        } catch (error) {
          console.error(`Error processing company ${companyDoc.id}:`, error);
          errorCount++;
        }
      }

      console.log(
        `Completed metrics calculation. Success: ${successCount}, Errors: ${errorCount}`
      );

      return {
        status: 'success',
        companiesProcessed: successCount,
        errors: errorCount,
        timestamp: dateString,
      };
    } catch (error) {
      console.error('Fatal error in calculateAnalyticsMetrics:', error);
      throw error;
    }
  }
);

/**
 * Manual trigger function (optional - for testing)
 * Can be called from admin panel
 */
exports.calculateAnalyticsMetricsManual = require('firebase-functions/v2/https').onCall(
  async (request) => {
    // Verify caller is admin
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new Error('Unauthenticated');
    }

    const adminSnap = await db.doc(`admin_users/${callerUid}`).get();
    if (!adminSnap.exists || !adminSnap.data().isActive) {
      throw new Error('Not authorized - admin only');
    }

    console.log(`Manual trigger by ${callerUid}`);

    // Run same logic as scheduled function
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    try {
      const companiesSnapshot = await db.collection('companies').get();
      const companies = companiesSnapshot.docs;

      let successCount = 0;
      let errorCount = 0;

      for (const companyDoc of companies) {
        try {
          const company = companyDoc.data();
          const companyId = companyDoc.id;

          const reviewsSnapshot = await db
            .collection('reviews')
            .where('companyId', '==', companyId)
            .get();

          const reviews = reviewsSnapshot.docs.map(d => d.data());

          const basicMetrics = calculateBasicMetrics(reviews);
          const sentimentMetrics = calculateSentimentScore(reviews);
          const trendMetrics = calculateTrendMetrics(reviews);

          const metricsData = {
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            date: dateString,
            companyId,
            companyName: company.companyName || company.name,
            category: company.category,
            totalReviews: basicMetrics.totalReviews,
            avgRating: basicMetrics.avgRating,
            responseRate: basicMetrics.responseRate,
            reviewCountThisMonth: basicMetrics.reviewCountThisMonth,
            ratingDistribution: basicMetrics.ratingDistribution,
            sentimentScore: sentimentMetrics.overallScore,
            positivePercentage: sentimentMetrics.positivePercentage,
            negativePercentage: sentimentMetrics.negativePercentage,
            neutralPercentage: sentimentMetrics.neutralPercentage,
            growthRate: trendMetrics.growthRate,
            currentMonthCount: trendMetrics.currentMonthCount,
            previousMonthCount: trendMetrics.previousMonthCount,
            dataPoints: reviews.length,
            calculatedAt: new Date().toISOString(),
          };

          await db.collection('analytics_metrics').doc(companyId).collection('daily').doc(dateString).set(metricsData);

          await db.collection('analytics_metrics').doc(companyId).set(
            {
              latest: metricsData,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          successCount++;
        } catch (error) {
          console.error(`Error processing company ${companyDoc.id}:`, error);
          errorCount++;
        }
      }

      return {
        status: 'success',
        companiesProcessed: successCount,
        errors: errorCount,
        timestamp: dateString,
      };
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
);
