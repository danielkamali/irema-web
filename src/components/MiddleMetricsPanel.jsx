import React from 'react';
import MetricCard from './MetricCard';

/**
 * Middle Tier Metrics Panel
 * Shows advanced metrics including sentiment, competitor benchmarking, and trends
 */
export default function MiddleMetricsPanel({ metrics = {}, category = 'restaurant' }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
        <p>No metrics data yet. Check back when you have more reviews!</p>
      </div>
    );
  }

  const {
    avgRating = 0,
    totalReviews = 0,
    responseRate = 0,
    sentimentScore = 50,
    positivePercentage = 0,
    negativePercentage = 0,
    ratingDistribution = {},
    topPraisedThemes = [],
    topComplaintThemes = [],
    competitorRank = { rank: 1, outOf: 15 },
    reviewVelocity = 0,
    growthRate = 0,
    pricePerception = 'neutral',
  } = metrics;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: '#1f2937' }}>
          📊 Advanced Analytics
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Sentiment analysis, competitor benchmarking, and trend insights
        </p>
      </div>

      {/* Core Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <MetricCard
          icon="⭐"
          label="Average Rating"
          value={avgRating.toFixed(1)}
          unit="/ 5.0"
          color="#2d8f6f"
        />

        <MetricCard
          icon="📝"
          label="Total Reviews"
          value={totalReviews}
          color="#2d8f6f"
        />

        <MetricCard
          icon="💬"
          label="Response Rate"
          value={responseRate.toFixed(1)}
          unit="%"
          color="#2d8f6f"
        />

        <MetricCard
          icon="😊"
          label="Sentiment Score"
          value={sentimentScore}
          unit="/ 100"
          color={sentimentScore > 60 ? '#10b981' : sentimentScore > 40 ? '#f59e0b' : '#ef4444'}
        />

        <MetricCard
          icon="📈"
          label="Growth Rate"
          value={growthRate.toFixed(1)}
          unit="%"
          trend={growthRate}
          color="#2d8f6f"
        />

        <MetricCard
          icon="⏱️"
          label="Review Velocity"
          value={reviewVelocity.toFixed(1)}
          unit="per week"
          color="#2d8f6f"
        />
      </div>

      {/* Sentiment Breakdown */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1f2937' }}>
          😊 Sentiment Breakdown
        </h3>

        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>Positive</div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#10b981',
                marginBottom: 4,
              }}
            >
              {positivePercentage}%
            </div>
            <div
              style={{
                height: 8,
                background: '#f3f4f6',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${positivePercentage}%`,
                  background: '#10b981',
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>Negative</div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#ef4444',
                marginBottom: 4,
              }}
            >
              {negativePercentage}%
            </div>
            <div
              style={{
                height: 8,
                background: '#f3f4f6',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${negativePercentage}%`,
                  background: '#ef4444',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Themes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {/* Praised Themes */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '0.95rem' }}>
            ✨ What Customers Love
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topPraisedThemes.slice(0, 3).map((theme, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ color: '#166534', fontWeight: 500 }}>{theme.theme}</span>
                <span
                  style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {theme.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Complaint Themes */}
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '0.95rem' }}>
            ⚠️ Top Complaints
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topComplaintThemes.slice(0, 3).map((theme, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{ color: '#991b1b', fontWeight: 500 }}>{theme.theme}</span>
                <span
                  style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {theme.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Competitor Ranking */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1f2937' }}>
          🏆 Competitive Position
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#2d8f6f',
              textAlign: 'center',
              width: 80,
            }}
          >
            #{competitorRank.rank}
          </div>

          <div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: 4 }}>
              You rank <strong>#{competitorRank.rank}</strong> out of <strong>{competitorRank.outOf}</strong> similar{' '}
              {category} businesses in your area
            </div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {competitorRank.ratingGap > 0
                ? `📈 ${Math.abs(competitorRank.ratingGap)} points above average`
                : `📉 ${Math.abs(competitorRank.ratingGap)} points below average`}
            </div>
          </div>
        </div>
      </div>

      {/* Price Perception */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: '#1f2937' }}>
          💰 Price Perception
        </h4>
        <div
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            background:
              pricePerception === 'good_value'
                ? '#dcfce7'
                : pricePerception === 'expensive'
                  ? '#fee2e2'
                  : '#f3f4f6',
            color:
              pricePerception === 'good_value'
                ? '#166534'
                : pricePerception === 'expensive'
                  ? '#991b1b'
                  : '#374151',
            borderRadius: 6,
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {pricePerception === 'good_value'
            ? '✨ Customers see good value'
            : pricePerception === 'expensive'
              ? '⚠️ Customers think it\'s expensive'
              : '➖ Neutral price perception'}
        </div>
      </div>

      {/* Lock Message */}
      <div
        style={{
          padding: 16,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 12,
          textAlign: 'center',
          color: '#1e40af',
          fontSize: '0.9rem',
        }}
      >
        <strong>🔒 Premium features locked</strong>
        <br />
        Upgrade to get AI recommendations, revenue forecasting, and executive reports
      </div>
    </div>
  );
}
