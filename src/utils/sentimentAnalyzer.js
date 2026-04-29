/**
 * Sentiment Analyzer
 * Keyword-based sentiment analysis and theme extraction from review text
 */

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
  'loved',
  'best',
  'perfect',
  'recommend',
  'recommended',
  'highly recommend',
  'impressed',
  'impressed',
  'satisfied',
  'happy',
  'friendly',
  'helpful',
  'professional',
  'quality',
  'clean',
  'fast',
  'efficient',
  'value',
  'worth',
];

const NEGATIVE_KEYWORDS = [
  'bad',
  'terrible',
  'awful',
  'horrible',
  'poor',
  'worst',
  'hate',
  'hated',
  'disappointed',
  'disappointing',
  'rude',
  'unprofessional',
  'slow',
  'overpriced',
  'expensive',
  'cheap',
  'dirty',
  'broken',
  'waste',
  'wasted',
  'never',
  'worse',
  'issue',
  'problem',
  'issues',
  'problems',
  'complained',
  'complained',
  'frustrating',
  'frustration',
];

const PAIN_POINT_KEYWORDS = {
  service: [
    'slow',
    'rude',
    'unprofessional',
    'unhelpful',
    'service',
    'waited',
    'waiting',
    'long wait',
    'no response',
    'didn\'t help',
    'dismissive',
  ],
  quality: [
    'broken',
    'cheap',
    'poor quality',
    'defective',
    'doesn\'t work',
    'not as described',
    'disappointing',
    'subpar',
    'low quality',
  ],
  price: [
    'expensive',
    'overpriced',
    'too much',
    'not worth',
    'bad value',
    'costly',
    'charges',
    'fee',
    'hidden',
    'overcharge',
    'price is high',
  ],
  product: [
    'product',
    'food',
    'menu',
    'items',
    'selection',
    'limited',
    'out of stock',
    'unavailable',
    'not available',
  ],
  staff: [
    'staff',
    'employee',
    'employees',
    'manager',
    'manager',
    'rude',
    'unfriendly',
    'unprofessional',
    'knowl edge',
    'untrained',
  ],
  cleanliness: [
    'clean',
    'dirty',
    'hygiene',
    'messy',
    'unsanitary',
    'filthy',
    'uncleaned',
    'dust',
  ],
  wait_time: [
    'wait',
    'waiting',
    'long',
    'slow',
    'took',
    'forever',
    'hours',
    'minutes',
  ],
  ambiance: [
    'atmosphere',
    'ambiance',
    'noisy',
    'crowded',
    'cramped',
    'cold',
    'uncomfortable',
    'decor',
  ],
};

const PRAISE_POINT_KEYWORDS = {
  service: [
    'fast',
    'quick',
    'responsive',
    'helpful',
    'friendly',
    'professional',
    'attentive',
    'courteous',
    'excellent service',
  ],
  quality: [
    'excellent quality',
    'high quality',
    'durable',
    'works great',
    'reliable',
    'consistent',
    'premium',
    'top notch',
  ],
  price: [
    'good value',
    'value for money',
    'affordable',
    'reasonable',
    'fair price',
    'worth the price',
    'reasonable price',
  ],
  product: [
    'fresh',
    'delicious',
    'tasty',
    'flavorful',
    'variety',
    'selection',
    'good selection',
    'unique',
  ],
  staff: [
    'knowledgeable',
    'experienced',
    'professional',
    'courteous',
    'helpful staff',
    'friendly staff',
    'expert',
  ],
  cleanliness: [
    'spotless',
    'immaculate',
    'hygienic',
    'well maintained',
    'clean',
    'neat',
  ],
  ambiance: [
    'comfortable',
    'cozy',
    'beautiful',
    'welcoming',
    'nice atmosphere',
    'great ambiance',
    'peaceful',
  ],
  location: [
    'convenient',
    'convenient location',
    'good location',
    'easy access',
    'accessible',
  ],
};

/**
 * Analyze sentiment of a review
 * @param {string} text - Review text
 * @returns {object} { sentiment, score, themes }
 */
export function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return {
      sentiment: 'neutral',
      score: 50,
      themes: [],
    };
  }

  const lowerText = text.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;
  const detectedThemes = new Set();

  // Count positive keywords
  POSITIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });

  // Count negative keywords
  NEGATIVE_KEYWORDS.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });

  // Detect pain point themes
  Object.entries(PAIN_POINT_KEYWORDS).forEach(([theme, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedThemes.add(`pain_${theme}`);
      }
    });
  });

  // Detect praise point themes
  Object.entries(PRAISE_POINT_KEYWORDS).forEach(([theme, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        detectedThemes.add(`praise_${theme}`);
      }
    });
  });

  // Determine overall sentiment
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

  return {
    sentiment,
    score: Math.round(score),
    themes: Array.from(detectedThemes),
  };
}

/**
 * Extract top praised themes from reviews
 * @param {array} reviews - Array of review objects with comment field
 * @returns {array} Top 5 praised themes with counts
 */
export function extractTopPraisedThemes(reviews) {
  const themeCounts = {};

  reviews.forEach(review => {
    if (!review.comment) return;
    const analysis = analyzeSentiment(review.comment);

    analysis.themes
      .filter(t => t.startsWith('praise_'))
      .forEach(theme => {
        const themeKey = theme.replace('praise_', '');
        themeCounts[themeKey] = (themeCounts[themeKey] || 0) + 1;
      });
  });

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({
      theme: formatThemeName(theme),
      count,
      percentage: Math.round((count / reviews.length) * 100),
    }));
}

/**
 * Extract top complaint themes from reviews
 * @param {array} reviews - Array of review objects with comment field
 * @returns {array} Top 5 complaint themes with counts
 */
export function extractTopComplaintThemes(reviews) {
  const themeCounts = {};

  reviews.forEach(review => {
    if (!review.comment) return;
    const analysis = analyzeSentiment(review.comment);

    analysis.themes
      .filter(t => t.startsWith('pain_'))
      .forEach(theme => {
        const themeKey = theme.replace('pain_', '');
        themeCounts[themeKey] = (themeCounts[themeKey] || 0) + 1;
      });
  });

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({
      theme: formatThemeName(theme),
      count,
      percentage: Math.round((count / reviews.length) * 100),
    }));
}

/**
 * Calculate sentiment score for a collection of reviews
 * @param {array} reviews - Array of review objects
 * @returns {object} { overallScore, positiveCount, negativeCount, neutralCount }
 */
export function calculateSentimentScore(reviews) {
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
    const analysis = analyzeSentiment(review.comment);
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

/**
 * Detect price-related mentions in reviews
 * @param {array} reviews - Array of review objects
 * @returns {object} { pricePerception, mentions, sentiment }
 */
export function analyzePricePerception(reviews) {
  const priceKeywords = [
    'price',
    'cost',
    'expensive',
    'cheap',
    'affordable',
    'value',
    'worth',
    'overpriced',
    'fee',
    'charge',
    'rate',
  ];

  let pricePositive = 0;
  let priceNegative = 0;
  let mentions = 0;

  reviews.forEach(review => {
    if (!review.comment) return;

    const text = review.comment.toLowerCase();
    const hasPriceMention = priceKeywords.some(keyword =>
      text.includes(keyword)
    );

    if (hasPriceMention) {
      mentions++;
      const analysis = analyzeSentiment(review.comment);

      if (analysis.sentiment === 'positive') pricePositive++;
      else if (analysis.sentiment === 'negative') priceNegative++;
    }
  });

  let pricePerception = 'neutral';
  if (pricePositive > priceNegative) pricePerception = 'good_value';
  else if (priceNegative > pricePositive) pricePerception = 'expensive';

  return {
    pricePerception,
    mentions,
    mentionPercentage: Math.round((mentions / reviews.length) * 100),
    positiveRatio: mentions > 0 ? Math.round((pricePositive / mentions) * 100) : 0,
    negativeRatio: mentions > 0 ? Math.round((priceNegative / mentions) * 100) : 0,
  };
}

/**
 * Format theme name for display
 * @param {string} theme - Theme key
 * @returns {string} Formatted theme name
 */
function formatThemeName(theme) {
  return theme
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get sentiment icon
 * @param {string} sentiment - 'positive', 'negative', 'neutral'
 * @returns {string} Icon emoji
 */
export function getSentimentIcon(sentiment) {
  const icons = {
    positive: '😊',
    negative: '😞',
    neutral: '😐',
  };
  return icons[sentiment] || '😐';
}

/**
 * Get sentiment color
 * @param {string} sentiment - 'positive', 'negative', 'neutral'
 * @returns {string} Color hex code
 */
export function getSentimentColor(sentiment) {
  const colors = {
    positive: '#2d8f6f',
    negative: '#ef4444',
    neutral: '#9ca3af',
  };
  return colors[sentiment] || '#9ca3af';
}
