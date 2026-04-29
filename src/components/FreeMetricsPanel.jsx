import React from 'react';
import MetricCard from './MetricCard';

/**
 * Free Tier Metrics Panel
 * Shows basic metrics available to free tier users
 */
export default function FreeMetricsPanel({ metrics = {}, category = 'restaurant' }) {
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
    reviewCountThisMonth = 0,
    topComplaint = 'N/A',
    ratingDistribution = {},
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
          📊 Analytics Overview
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
          Basic metrics to track your business performance
        </p>
      </div>

      {/* Metric Cards Grid */}
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
          subtext="All-time reviews"
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
          icon="📅"
          label="Reviews This Month"
          value={reviewCountThisMonth}
          subtext="Last 30 days"
          color="#2d8f6f"
        />
      </div>

      {/* Rating Distribution */}
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
          ⭐ Rating Distribution
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[5, 4, 3, 2, 1].map(stars => (
            <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 40, fontSize: '14px', fontWeight: 600 }}>
                {stars}★
              </span>

              <div
                style={{
                  flex: 1,
                  height: 24,
                  background: '#f3f4f6',
                  borderRadius: 6,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${totalReviews > 0 ? (ratingDistribution[stars] / totalReviews) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #2d8f6f, #1f6b52)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <span
                style={{
                  width: 50,
                  textAlign: 'right',
                  fontSize: '14px',
                  color: '#666',
                  fontWeight: 500,
                }}
              >
                {ratingDistribution[stars] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Complaint */}
      <div
        style={{
          background: '#fef3f2',
          border: '1px solid #fee4e2',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
            Most Common Complaint
          </div>
          <div style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>
            {topComplaint}
          </div>
        </div>
      </div>

      {/* Lock Message */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 12,
          textAlign: 'center',
          color: '#1e40af',
          fontSize: '0.9rem',
        }}
      >
        <strong>🔒 Premium metrics locked</strong>
        <br />
        Upgrade to see sentiment analysis, competitor benchmarking, trends, and AI recommendations
      </div>
    </div>
  );
}
