import React from 'react';
import MetricCard from './MetricCard';

/**
 * Premium Tier Metrics Panel
 * Shows all available metrics including AI recommendations
 */
export default function PremiumMetricsPanel({ metrics = {}, category = 'restaurant' }) {
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
    neutralPercentage = 0,
    ratingDistribution = {},
    topPraisedThemes = [],
    topComplaintThemes = [],
    competitorRank = { rank: 1, outOf: 15 },
    reviewVelocity = 0,
    growthRate = 0,
    pricePerception = 'neutral',
  } = metrics;

  // Generate AI recommendations
  const generateRecommendations = () => {
    const recs = [];

    if (avgRating < 3.5) {
      recs.push({
        priority: 'high',
        icon: '🚨',
        title: 'Improve Overall Rating',
        desc: 'Your rating is below category average.',
        action: 'Address top complaints',
      });
    }

    if (responseRate < 50) {
      recs.push({
        priority: 'high',
        icon: '💬',
        title: 'Increase Response Rate',
        desc: `Only responding to ${responseRate}% of reviews.`,
        action: 'Engage with all customers',
      });
    }

    if (negativePercentage > 40) {
      recs.push({
        priority: 'medium',
        icon: '⚠️',
        title: 'High Negative Sentiment',
        desc: `${negativePercentage}% of reviews are negative.`,
        action: `Focus on: ${topComplaintThemes[0]?.theme || 'service quality'}`,
      });
    }

    if (reviewVelocity === 0) {
      recs.push({
        priority: 'medium',
        icon: '📈',
        title: 'Boost Review Velocity',
        desc: 'No recent reviews. Encourage feedback.',
        action: 'Create QR codes and request reviews',
      });
    }

    return recs.slice(0, 3);
  };

  const recommendations = generateRecommendations();

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
          🤖 Premium Analytics + AI Insights
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Complete analytics with AI-powered recommendations and forecasts
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

      {/* Sentiment Deep Dive */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#1f2937' }}>
          📊 Sentiment Analysis
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Positive */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: 4 }}>😊</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
              {positivePercentage}%
            </div>
            <div style={{ fontSize: '12px', color: '#166534' }}>Positive Reviews</div>
          </div>

          {/* Neutral */}
          <div
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: 4 }}>😐</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>
              {neutralPercentage}%
            </div>
            <div style={{ fontSize: '12px', color: '#4b5563' }}>Neutral Reviews</div>
          </div>

          {/* Negative */}
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: 4 }}>😞</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
              {negativePercentage}%
            </div>
            <div style={{ fontSize: '12px', color: '#991b1b' }}>Negative Reviews</div>
          </div>
        </div>

        {/* Theme Comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '0.95rem' }}>
              ✨ Praised Aspects
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topPraisedThemes.slice(0, 3).map((theme, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#f0fdf4',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ color: '#166534', fontWeight: 500 }}>{theme.theme}</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{theme.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 12px 0', color: '#991b1b', fontSize: '0.95rem' }}>
              ⚠️ Problem Areas
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topComplaintThemes.slice(0, 3).map((theme, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    borderRadius: 6,
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ color: '#991b1b', fontWeight: 500 }}>{theme.theme}</span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{theme.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Competitive Analysis */}
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
          🏆 Competitive Intelligence
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', fontWeight: 700, color: '#2d8f6f', marginBottom: 4 }}>
              #{competitorRank.rank}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>of {competitorRank.outOf}</div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: 4 }}>
                Your Position
              </div>
              <div
                style={{
                  height: 32,
                  background: '#f3f4f6',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(competitorRank.rank / competitorRank.outOf) * 100}%`,
                    background: 'linear-gradient(90deg, #2d8f6f, #1f6b52)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Top {Math.round((competitorRank.rank / competitorRank.outOf) * 100)}%
                </div>
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#666' }}>
              {competitorRank.ratingGap > 0
                ? `📈 You're ${Math.abs(competitorRank.ratingGap)} points above the category average`
                : `📉 You're ${Math.abs(competitorRank.ratingGap)} points below the category average`}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div
        style={{
          background: '#f8f9fa',
          border: '2px solid #2d8f6f',
          borderRadius: 12,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', color: '#1f2937' }}>
          🤖 AI Recommendations
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recommendations.map((rec, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <div style={{ fontSize: '20px', minWidth: 24, marginTop: 2 }}>{rec.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2, color: '#1f2937' }}>
                  {rec.title}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 4 }}>
                  {rec.desc}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2d8f6f', fontWeight: 500 }}>
                  💡 {rec.action}
                </div>
              </div>
              <div
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background:
                    rec.priority === 'high'
                      ? '#fee2e2'
                      : rec.priority === 'medium'
                        ? '#fef3c7'
                        : '#dcfce7',
                  color:
                    rec.priority === 'high'
                      ? '#991b1b'
                      : rec.priority === 'medium'
                        ? '#92400e'
                        : '#166534',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  minWidth: 50,
                  textAlign: 'center',
                }}
              >
                {rec.priority.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Report CTA */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2d8f6f 0%, #1f6b52 100%)',
          color: 'white',
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '20px', marginBottom: 8 }}>📊</div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Monthly Executive Report</div>
        <div style={{ fontSize: '0.9rem', marginBottom: 12, opacity: 0.9 }}>
          Get a comprehensive PDF report delivered to your email every month
        </div>
        <button
          style={{
            background: 'white',
            color: '#2d8f6f',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Enable Monthly Reports
        </button>
      </div>
    </div>
  );
}
