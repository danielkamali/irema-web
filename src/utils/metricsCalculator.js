/**
 * Metrics Calculator
 * Calculate all analytics metrics from review data
 */

import {
  calculateSentimentScore,
  extractTopPraisedThemes,
  extractTopComplaintThemes,
  analyzePricePerception,
} from './sentimentAnalyzer';

/**
 * Calculate all metrics for a company
 * @param {object} company - Company doc
 * @param {array} reviews - Array of review docs for this company
 * @param {array} competitorReviews - Reviews from competitor companies (for benchmarking)
 * @returns {object} Complete metrics object
 */
export function calculateAllMetrics(company, reviews = [], competitorReviews = []) {
  const basicMetrics = calculateBasicMetrics(reviews);
  const sentimentMetrics = calculateSentimentMetrics(reviews);
  const themeMetrics = calculateThemeMetrics(reviews);
  const trendMetrics = calculateTrendMetrics(reviews);
  const competitorMetrics = calculateCompetitorMetrics(reviews, competitorReviews);
  const priceMetrics = calculatePriceMetrics(reviews);

  return {
    timestamp: new Date().toISOString(),
    companyId: company.id,
    companyName: company.companyName || company.name,
    category: company.category,
    totalDataPoints: reviews.length,
    ...basicMetrics,
    ...sentimentMetrics,
    ...themeMetrics,
    ...trendMetrics,
    ...competitorMetrics,
    ...priceMetrics,
  };
}

/**
 * Calculate basic metrics (rating, reviews, response rate)
 */
export function calculateBasicMetrics(reviews = []) {
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

  // Reviews from last 30 days
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

/**
 * Calculate sentiment-based metrics
 */
export function calculateSentimentMetrics(reviews = []) {
  const sentimentScore = calculateSentimentScore(reviews);

  return {
    sentimentScore: sentimentScore.overallScore,
    positiveReviews: sentimentScore.positiveCount,
    negativeReviews: sentimentScore.negativeCount,
    neutralReviews: sentimentScore.neutralCount,
    positivePercentage: sentimentScore.positivePercentage,
    negativePercentage: sentimentScore.negativePercentage,
    neutralPercentage: sentimentScore.neutralPercentage,
  };
}

/**
 * Calculate theme extraction metrics
 */
export function calculateThemeMetrics(reviews = []) {
  const topPraisedThemes = extractTopPraisedThemes(reviews);
  const topComplaintThemes = extractTopComplaintThemes(reviews);

  return {
    topPraisedThemes,
    topComplaintThemes,
    topComplaint: topComplaintThemes[0]?.theme || 'N/A',
    topPraise: topPraisedThemes[0]?.theme || 'N/A',
  };
}

/**
 * Calculate trend metrics
 */
export function calculateTrendMetrics(reviews = []) {
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

  // Calculate average review velocity (reviews per week)
  const reviewVelocity = calculateReviewVelocity(reviews);

  // Seasonal analysis
  const seasonalAnalysis = analyzeSeasonality(reviews);

  return {
    reviewVelocity,
    growthRate,
    currentMonthCount,
    previousMonthCount,
    seasonalAnalysis,
  };
}

/**
 * Calculate competitor metrics
 */
export function calculateCompetitorMetrics(reviews = [], competitorReviews = []) {
  const ownAvgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(2)
    : 0;

  let competitorAvgRating = 0;
  if (competitorReviews.length > 0) {
    competitorAvgRating = (
      competitorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / competitorReviews.length
    ).toFixed(2);
  }

  const ratingGap = parseFloat((ownAvgRating - competitorAvgRating).toFixed(2));

  // Simple ranking: assume there are ~15 competitors in average category
  let competitorRank = 1;
  if (ratingGap < -0.5) competitorRank = 10;
  else if (ratingGap < -0.2) competitorRank = 7;
  else if (ratingGap < 0) competitorRank = 5;
  else if (ratingGap < 0.2) competitorRank = 3;

  return {
    competitorRank: {
      rank: competitorRank,
      outOf: 15,
      ratingGap,
      ratingBetter: ratingGap > 0,
    },
  };
}

/**
 * Calculate price-related metrics
 */
export function calculatePriceMetrics(reviews = []) {
  const pricePerception = analyzePricePerception(reviews);

  return {
    pricePerception: pricePerception.pricePerception,
    priceMentions: pricePerception.mentions,
    priceMentionPercentage: pricePerception.mentionPercentage,
    pricePositiveRatio: pricePerception.positiveRatio,
    priceNegativeRatio: pricePerception.negativeRatio,
  };
}

/**
 * Calculate average rating by month
 */
export function calculateMonthlyRating(reviews = []) {
  const monthlyData = {};

  reviews.forEach(review => {
    if (!review.createdAt) return;

    const date = review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { ratings: [], count: 0 };
    }

    monthlyData[monthKey].ratings.push(review.rating || 0);
    monthlyData[monthKey].count++;
  });

  const monthlyRatings = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      avgRating: parseFloat((data.ratings.reduce((a, b) => a + b, 0) / data.count).toFixed(2)),
      reviewCount: data.count,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return monthlyRatings;
}

/**
 * Calculate review velocity (reviews per week)
 */
function calculateReviewVelocity(reviews = []) {
  if (reviews.length === 0) return 0;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const lastMonthReviews = reviews.filter(r => {
    const reviewDate = r.createdAt?.toMillis?.() || 0;
    return reviewDate > thirtyDaysAgo;
  });

  const weeksInMonth = 4.33;
  return parseFloat((lastMonthReviews.length / weeksInMonth).toFixed(2));
}

/**
 * Analyze seasonality in reviews
 */
function analyzeSeasonality(reviews = []) {
  const monthCounts = {};

  reviews.forEach(review => {
    if (!review.createdAt) return;

    const date = review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt);
    const month = date.getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const peakMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    peakMonth: peakMonth ? months[peakMonth[0]] : 'N/A',
    peakMonthCount: peakMonth ? peakMonth[1] : 0,
    monthlyDistribution: monthCounts,
  };
}

/**
 * Calculate quality score (0-100 based on rating, sentiment, response rate)
 */
export function calculateQualityScore(reviews = []) {
  if (reviews.length === 0) return 0;

  const basicMetrics = calculateBasicMetrics(reviews);
  const sentimentMetrics = calculateSentimentMetrics(reviews);

  // Weight: 40% rating, 30% sentiment, 30% response rate
  const ratingScore = (basicMetrics.avgRating / 5) * 40;
  const sentimentScore = sentimentMetrics.positivePercentage * 0.3;
  const responseScore = basicMetrics.responseRate * 0.3;

  return Math.round(ratingScore + sentimentScore + responseScore);
}

/**
 * Generate AI recommendations based on metrics
 */
export function generateRecommendations(metrics, category) {
  const recommendations = [];

  if (metrics.avgRating < 3.5) {
    recommendations.push({
      priority: 'high',
      title: 'Improve Overall Rating',
      description: 'Your rating is below category average. Focus on addressing top complaints.',
      action: 'Review complaint themes and create action plan',
    });
  }

  if (metrics.responseRate < 50) {
    recommendations.push({
      priority: 'high',
      title: 'Increase Response Rate',
      description: 'Only responding to 50% of reviews. Engage with customers more actively.',
      action: 'Set reminder to respond to all new reviews',
    });
  }

  if (metrics.negativePercentage > 40) {
    recommendations.push({
      priority: 'medium',
      title: 'Address Negative Sentiment',
      description: `${metrics.negativePercentage}% of reviews are negative. This may indicate systemic issues.`,
      action: `Focus on improving: ${metrics.topComplaintThemes[0]?.theme || 'service'}`,
    });
  }

  if (metrics.reviewVelocity === 0) {
    recommendations.push({
      priority: 'medium',
      title: 'Increase Review Volume',
      description: 'No recent reviews. Encourage customers to share their experience.',
      action: 'Create QR codes and follow-up emails requesting reviews',
    });
  }

  if (metrics.priceNegativeRatio > 60) {
    recommendations.push({
      priority: 'medium',
      title: 'Review Pricing Strategy',
      description: 'Many customers mention price negatively. Consider your pricing model.',
      action: 'Compare pricing with competitors or improve value perception',
    });
  }

  return recommendations.slice(0, 3); // Top 3 recommendations
}
