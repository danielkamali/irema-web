import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';
import './AdminAnalytics.css';

const TIME_FILTERS = [
  { label:'1h',  ms:3600000 },
  { label:'1d',  ms:86400000 },
  { label:'1w',  ms:7*86400000 },
  { label:'1mo', ms:30*86400000 },
  { label:'6mo', ms:180*86400000 },
  { label:'1y',  ms:365*86400000 },
  { label:'5y',  ms:5*365*86400000 },
];

function buildBuckets(items, tsField, filterMs) {
  const now = Date.now();
  const cutoff = now - filterMs;
  const recent = items.filter(item => {
    const ts = item[tsField];
    if (!ts) return false;
    const t = ts.toDate ? ts.toDate().getTime() : ts.seconds ? ts.seconds * 1000 : 0;
    return t >= cutoff;
  });
  const BUCKETS = 8;
  const bucketMs = filterMs / BUCKETS;
  const counts = Array(BUCKETS).fill(0);
  const labels = Array.from({ length: BUCKETS }, (_, i) => {
    const t = cutoff + i * bucketMs + bucketMs / 2;
    if (filterMs <= 86400000) return new Date(t).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    if (filterMs <= 7 * 86400000) return new Date(t).toLocaleDateString('en', { weekday: 'short' });
    if (filterMs <= 90 * 86400000) return new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    return new Date(t).toLocaleDateString('en', { month: 'short', year: '2-digit' });
  });
  recent.forEach(item => {
    const ts = item[tsField];
    const t = ts?.toDate ? ts.toDate().getTime() : ts?.seconds ? ts.seconds * 1000 : 0;
    const idx = Math.min(Math.floor((t - cutoff) / bucketMs), BUCKETS - 1);
    if (idx >= 0) counts[idx]++;
  });
  return { labels, counts };
}

function insightFromData(users, businesses, reviews) {
  const insights = [];
  const now = Date.now();

  if (!reviews.length) {
    insights.push('📭 No reviews yet — insights will appear once users start reviewing businesses.');
  } else {
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    if (avg >= 4) insights.push(`✅ Strong platform health: average rating ${avg.toFixed(1)} / 5 — users are satisfied.`);
    else if (avg < 3) insights.push(`⚠️ Platform average rating ${avg.toFixed(1)} is below average. Follow up with low-rated businesses.`);
    else insights.push(`📊 Average platform rating is ${avg.toFixed(1)} / 5. Room to improve through engagement.`);

    const last30 = reviews.filter(r => now - (r.createdAt?.seconds || 0) * 1000 < 30 * 86400000);
    const prev30 = reviews.filter(r => {
      const age = now - (r.createdAt?.seconds || 0) * 1000;
      return age >= 30 * 86400000 && age < 60 * 86400000;
    });
    if (prev30.length > 0) {
      const pct = Math.round((last30.length / prev30.length - 1) * 100);
      if (pct > 20) insights.push(`📈 Review volume up ${pct}% vs previous month — great engagement momentum!`);
      else if (pct < -20) insights.push(`📉 Review volume down ${Math.abs(pct)}% vs previous month — consider running a review campaign.`);
    }
  }

  const unverified = businesses.filter(b => !b.isVerified).length;
  if (unverified > 0) insights.push(`🔍 ${unverified} businesses are unverified. Verified businesses get 40% more reviews on average.`);

  const lowRated = businesses.filter(b => (b.averageRating || 0) > 0 && b.averageRating < 2.5);
  if (lowRated.length) insights.push(`🚨 ${lowRated.length} businesses have ratings below 2.5 — consider reaching out.`);

  const noReviews = businesses.filter(b => !(b.totalReviews > 0)).length;
  if (noReviews > 0) insights.push(`🆕 ${noReviews} businesses have no reviews yet — promote them to new users.`);

  const newUsers30 = users.filter(u => now - (u.createdAt?.seconds || 0) * 1000 < 30 * 86400000);
  insights.push(`👥 ${newUsers30.length} new users joined in the last 30 days out of ${users.length} total.`);

  const topCats = {};
  businesses.forEach(b => { const c = b.category || 'other'; topCats[c] = (topCats[c] || 0) + 1; });
  const top = Object.entries(topCats).sort((a, b) => b[1] - a[1])[0];
  if (top) insights.push(`🏆 Top category: "${top[0]}" with ${top[1]} businesses. Consider diversifying into underserved sectors.`);

  return insights.slice(0, 6);
}

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const [rawData, setRawData] = useState({ users: [], businesses: [], reviews: [], subscriptions: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(TIME_FILTERS[4]);
  const [insights, setInsights] = useState([]);
  const charts = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const [uS, bS, rS, sS, pS] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'companies')),
          getDocs(collection(db, 'reviews')),
          getDocs(collection(db, 'subscriptions')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'payments')).catch(() => ({ docs: [] })),
        ]);
        const users = uS.docs.map(d => ({ id: d.id, ...d.data() }));
        const businesses = bS.docs.map(d => ({ id: d.id, ...d.data() }));
        const reviews = rS.docs.map(d => ({ id: d.id, ...d.data() }));
        const subscriptions = sS.docs.map(d => ({ id: d.id, ...d.data() }));
        const payments = pS.docs.map(d => ({ id: d.id, ...d.data() }));
        setRawData({ users, businesses, reviews, subscriptions, payments });
        setInsights(insightFromData(users, businesses, reviews));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const drawCharts = useCallback(() => {
    if (!window.Chart || loading) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const grid = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const tick = isDark ? '#8fa89e' : '#9ca3af';
    // Chart palette — emerald green primary with soft fill.
    const GREEN = '#2d8f6f', GREEN2 = 'rgba(45,143,111,0.15)', AMBER = '#f59e0b', BLUE = '#3b82f6';

    const make = (id, type, data, opts = {}) => {
      const el = document.getElementById(id); if (!el) return;
      if (charts.current[id]) charts.current[id].destroy();
      charts.current[id] = new window.Chart(el, {
        type, data,
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
          plugins: { legend: { labels: { color: tick, font: { size: 11 } } } },
          scales: type !== 'doughnut' && type !== 'pie' ? {
            y: { beginAtZero: true, grid: { color: grid }, ticks: { color: tick, font: { size: 11 } } },
            x: { grid: { color: 'transparent' }, ticks: { color: tick, font: { size: 11 }, maxTicksLimit: 8 } },
          } : undefined,
          ...opts,
        }
      });
    };

    // User growth — real data
    const ug = buildBuckets(rawData.users, 'createdAt', filter.ms);
    make('anUserGrowth', 'line', {
      labels: ug.labels,
      datasets: [{ label: 'New Users', data: ug.counts, borderColor: GREEN, backgroundColor: GREEN2, tension: 0.4, fill: true, pointRadius: 3 }]
    });

    // Reviews over time — real data
    const rg = buildBuckets(rawData.reviews, 'createdAt', filter.ms);
    make('anReviews', 'bar', {
      labels: rg.labels,
      datasets: [{ label: 'Reviews', data: rg.counts, backgroundColor: AMBER, borderRadius: 4 }]
    });

    // Business registrations — real data
    const bg = buildBuckets(rawData.businesses, 'createdAt', filter.ms);
    make('anBusinessGrowth', 'bar', {
      labels: bg.labels,
      datasets: [{ label: 'New Businesses', data: bg.counts, backgroundColor: BLUE, borderRadius: 4 }]
    });

    // User engagement (reviews written per user) — real data
    const engMap = { '0': 0, '1-2': 0, '3-5': 0, '6+': 0 };
    rawData.users.forEach(u => {
      const count = rawData.reviews.filter(r => r.userId === u.id).length;
      if (count === 0) engMap['0']++;
      else if (count <= 2) engMap['1-2']++;
      else if (count <= 5) engMap['3-5']++;
      else engMap['6+']++;
    });
    make('anEngagement', 'doughnut', {
      labels: ['No reviews', '1-2 reviews', '3-5 reviews', '6+ reviews'],
      datasets: [{ data: [engMap['0'], engMap['1-2'], engMap['3-5'], engMap['6+']], backgroundColor: [grid, AMBER, BLUE, GREEN], borderWidth: 0 }]
    }, { plugins: { legend: { position: 'right', labels: { color: tick, font: { size: 11 } } } } });

    // Rating distribution — real data
    const rDist = [1, 2, 3, 4, 5].map(r => rawData.reviews.filter(rv => Math.round(rv.rating || 0) === r).length);
    make('anRatings', 'bar', {
      labels: ['1★', '2★', '3★', '4★', '5★'],
      datasets: [{ label: 'Count', data: rDist, backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', GREEN], borderRadius: 4 }]
    }, { plugins: { legend: { display: false } } });

    // Category breakdown — real data
    const catMap = {};
    rawData.businesses.forEach(b => { const c = b.category || 'other'; catMap[c] = (catMap[c] || 0) + 1; });
    const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    make('anCategories', 'bar', {
      labels: cats.map(([k]) => k),
      datasets: [{ label: 'Businesses', data: cats.map(([, v]) => v), backgroundColor: [GREEN, AMBER, BLUE, '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'], borderRadius: 4 }]
    }, { indexAxis: 'y', plugins: { legend: { display: false } } });

  }, [rawData, filter, loading]);

  useEffect(() => {
    if (loading) return;
    if (!document.getElementById('chartjs-v9')) {
      const s = document.createElement('script'); s.id = 'chartjs-v9';
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = () => setTimeout(drawCharts, 50); document.head.appendChild(s);
    } else if (window.Chart) { setTimeout(drawCharts, 50); }
  }, [drawCharts, loading]);

  const now = Date.now();
  const reviewRate = rawData.users.length ? ((rawData.reviews.length / rawData.users.length) * 100).toFixed(0) : 0;
  const bizWithReviews = rawData.businesses.filter(b => (b.totalReviews || 0) > 0).length;
  const newUsers30 = rawData.users.filter(u => now - (u.createdAt?.seconds || 0) * 1000 < 30 * 86400000).length;
  const verifiedBiz = rawData.businesses.filter(b => b.isVerified).length;
  const avgRating = rawData.reviews.length ? (rawData.reviews.reduce((s, r) => s + (r.rating || 0), 0) / rawData.reviews.length).toFixed(1) : '—';
  const activeSubs = rawData.subscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = rawData.payments.reduce((s, p) => s + (p.amount || 0), 0);

  const metricCards = [
    { label: 'Total Users', val: rawData.users.length.toLocaleString(), sub: `+${newUsers30} this month`, icon: '👥', trend: null, cls: 'primary' },
    { label: 'Total Businesses', val: rawData.businesses.length.toLocaleString(), sub: `${verifiedBiz} verified`, icon: '🏢', trend: null, cls: 'success' },
    { label: 'Total Reviews', val: rawData.reviews.length.toLocaleString(), sub: `Avg rating: ${avgRating}`, icon: '⭐', trend: null, cls: 'warning' },
    { label: 'Review Rate', val: `${reviewRate}%`, sub: 'Users who reviewed', icon: '✍️', trend: null, cls: 'info' },
    { label: 'Businesses w/ Reviews', val: bizWithReviews, sub: `of ${rawData.businesses.length} total`, icon: '📊', trend: null, cls: 'primary' },
    { label: 'Active Subscriptions', val: activeSubs || rawData.subscriptions.length, sub: 'Business plans', icon: '📋', trend: null, cls: 'success' },
    { label: 'Total Revenue', val: totalRevenue > 0 ? `$${totalRevenue.toLocaleString()}` : 'Set up payments', sub: 'From payments collection', icon: '💰', trend: null, cls: 'warning' },
    { label: 'Platform Rating', val: avgRating, sub: 'Cross all reviews', icon: '🌟', trend: null, cls: 'info' },
  ];

  return (
    <AdminLayout>
      <div className="ap-page-header">
        <h1 className="ap-page-title">{t('admin.analytics_title')||'Analytics & Insights'}</h1>
        <div className="ap-header-actions">
          <div className="ap-chart-time-filters">
            {TIME_FILTERS.map(f => (
              <button key={f.label} className={`ap-chart-tf-btn${filter.label === f.label ? ' active' : ''}`}
                onClick={() => setFilter(f)}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="ap-analytics-kpis">
        {metricCards.map(m => (
          <div key={m.label} className="ap-kpi-card">
            <div className="ap-kpi-icon">{m.icon}</div>
            <div className="ap-kpi-body">
              <div className="ap-kpi-val">{loading ? '…' : m.val}</div>
              <div className="ap-kpi-label">{m.label}</div>
              <div className="ap-kpi-sub">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div className="ap-insights-card">
        <div className="ap-insights-header">
          <div className="ap-insights-icon">🤖</div>
          <div>
            <h3>{t('admin.ai_insights')||'AI Platform Insights'}</h3>
            <p>Auto-generated from your live Firestore data</p>
          </div>
        </div>
        <div className="ap-insights-grid">
          {loading
            ? [1, 2, 3].map(i => <div key={i} className="ap-insight-item skeleton" style={{ height: 60 }} />)
            : insights.map((ins, i) => <div key={i} className="ap-insight-item">{ins}</div>)
          }
        </div>
      </div>

      {/* 6 real-data charts */}
      <div className="ap-charts-grid">
        {[
          { id: 'anUserGrowth', title: 'User Growth' },
          { id: 'anReviews', title: 'Reviews Over Time' },
          { id: 'anBusinessGrowth', title: 'Business Registrations' },
          { id: 'anEngagement', title: 'User Engagement' },
          { id: 'anRatings', title: 'Rating Distribution' },
          { id: 'anCategories', title: 'Top Categories' },
        ].map(c => (
          <div key={c.id} className="ap-chart-card">
            <div className="ap-chart-header"><h3>{c.title}</h3><span className="ap-chart-note">{t('admin.live_data')||t('admin.live_data')||'Live data'}</span></div>
            <div className="ap-chart-canvas"><canvas id={c.id} /></div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="ap-reco-grid">
        {[
          { icon: '📣', title: 'Launch a Review Campaign', desc: 'Send an email nudge to users with 0 reviews. Studies show 1 targeted email = 3× review conversion.', cls: 'green' },
          { icon: '✅', title: 'Verify More Businesses', desc: `${rawData.businesses.filter(b => !b.isVerified).length} businesses are unverified. Verified badges build trust and increase reviews by up to 40%.`, cls: 'blue' },
          { icon: '💎', title: 'Upsell Premium Plans', desc: 'Businesses with 4+ stars and 10+ reviews are ideal targets for premium plan outreach.', cls: 'amber' },
          { icon: '🌍', title: 'Expand Category Coverage', desc: 'Diversify your business inventory with underrepresented sectors to attract broader search traffic.', cls: 'purple' },
        ].map(r => (
          <div key={r.title} className={`ap-reco-card ap-reco-${r.cls}`}>
            <div className="ap-reco-icon">{r.icon}</div>
            <h4>{r.title}</h4>
            <p>{r.desc}</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
