import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, collection, getDocs, query, orderBy, limit } from '../../firebase/config';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

const SvgIcon = ({ d, size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
);

const TIME_FILTERS = [
  { label:'5m',  ms: 5*60*1000 },
  { label:'1h',  ms: 60*60*1000 },
  { label:'1d',  ms: 86400000 },
  { label:'1w',  ms: 7*86400000 },
  { label:'1mo', ms: 30*86400000 },
  { label:'6mo', ms: 180*86400000 },
  { label:'1y',  ms: 365*86400000 },
  { label:'5y',  ms: 5*365*86400000 },
];

function buildTimeData(items, tsField, filter) {
  const now = Date.now();
  const cutoff = now - filter.ms;
  const recent = items.filter(item => {
    const ts = item[tsField];
    if (!ts) return false;
    const t = ts.toDate ? ts.toDate().getTime() : ts.seconds ? ts.seconds*1000 : 0;
    return t >= cutoff;
  });

  // Build buckets based on time range
  let buckets, bucketMs, fmt;
  if (filter.ms <= 60*60*1000) {
    buckets = 12; bucketMs = filter.ms/12;
    fmt = t => new Date(t).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
  } else if (filter.ms <= 7*86400000) {
    buckets = 7; bucketMs = filter.ms/7;
    fmt = t => new Date(t).toLocaleDateString('en',{weekday:'short'});
  } else if (filter.ms <= 90*86400000) {
    buckets = Math.min(filter.ms/86400000, 30); bucketMs = filter.ms/buckets;
    fmt = t => new Date(t).toLocaleDateString('en',{month:'short',day:'numeric'});
  } else {
    buckets = Math.round(filter.ms/(30*86400000)); bucketMs = filter.ms/buckets;
    fmt = t => new Date(t).toLocaleDateString('en',{month:'short',year:'2-digit'});
  }

  const counts = Array(Math.round(buckets)).fill(0);
  const labels = Array.from({length:Math.round(buckets)}, (_,i) => fmt(cutoff + i*bucketMs + bucketMs/2));
  
  recent.forEach(item => {
    const ts = item[tsField];
    const t = ts?.toDate ? ts.toDate().getTime() : ts?.seconds ? ts.seconds*1000 : 0;
    const idx = Math.min(Math.floor((t - cutoff) / bucketMs), counts.length-1);
    if (idx >= 0) counts[idx]++;
  });

  return { labels, counts };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users:0, businesses:0, reviews:0, avgRating:0, claims:0 });
  const [rawData, setRawData] = useState({ users:[], businesses:[], reviews:[] });
  const [loading, setLoading] = useState(true);
  
  // Per-chart time filters
  const [filterUsers, setFilterUsers] = useState(TIME_FILTERS[5]);    // 6mo
  const [filterReviews, setFilterReviews] = useState(TIME_FILTERS[5]);
  const [filterRatings, setFilterRatings] = useState(TIME_FILTERS[6]); // 1y
  const [filterCats, setFilterCats] = useState(TIME_FILTERS[6]);
  
  const charts = useRef({});
  const chartsDrawn = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        // Load reviews + recent data in parallel, use counts for fast KPI display
        const [uSnap, bSnap, rSnap, cSnap] = await Promise.all([
          getDocs(query(collection(db,'users'), orderBy('createdAt','desc'), limit(500))).catch(()=>({docs:[]})),
          getDocs(collection(db,'companies')).catch(()=>({docs:[]})),
          getDocs(query(collection(db,'reviews'), orderBy('createdAt','desc'), limit(500))).catch(()=>({docs:[]})),
          getDocs(collection(db,'claims')).catch(()=>({size:0,docs:[]})),
        ]);
        const users = uSnap.docs.map(d=>({id:d.id,...d.data()}));
        const businesses = bSnap.docs.map(d=>({id:d.id,...d.data()}));
        const reviews = rSnap.docs.map(d=>({id:d.id,...d.data()}));
        const avgRating = reviews.length ? (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1) : 0;
        setStats({ users:users.length, businesses:businesses.length, reviews:reviews.length, avgRating, claims:cSnap.size||cSnap.docs?.length||0 });
        setRawData({ users, businesses, reviews });
      } catch(e){ console.error(e); }
      setLoading(false);
    })();
  }, []);

  const drawCharts = useCallback(() => {
    if (!window.Chart || loading) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const grid = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
    const tick = isDark ? '#8fa89e' : '#9ca3af';
    // Matches AdminAnalytics palette — emerald green primary with soft fill.
    const GREEN = '#2d8f6f', GREEN2 = 'rgba(45,143,111,0.15)';
    const AMBER='#f59e0b', BLUE='#3b82f6';

    const make = (id, type, data, opts={}) => {
      const el = document.getElementById(id); if(!el) return;
      if(charts.current[id]) charts.current[id].destroy();
      charts.current[id] = new window.Chart(el, {
        type, data,
        options: {
          responsive:true, maintainAspectRatio:false,
          animation: { duration: 400 },
          plugins: { legend:{ labels:{ color:tick, font:{size:11} } }, tooltip:{ callbacks:{} } },
          scales: type!=='doughnut'&&type!=='pie' ? {
            y:{ beginAtZero:true, grid:{color:grid}, ticks:{color:tick,font:{size:11}} },
            x:{ grid:{color:'transparent'}, ticks:{color:tick,font:{size:11},maxTicksLimit:8} },
          } : undefined,
          ...opts,
        }
      });
    };

    const ud = buildTimeData(rawData.users, 'createdAt', filterUsers);
    make('chartUsers','line',{
      labels:ud.labels,
      datasets:[{label:'New Users',data:ud.counts,borderColor:GREEN,backgroundColor:GREEN2,tension:0.4,fill:true,pointBackgroundColor:GREEN,pointRadius:3}]
    });

    const rd = buildTimeData(rawData.reviews, 'createdAt', filterReviews);
    make('chartReviews','bar',{
      labels:rd.labels,
      datasets:[{label:'Reviews',data:rd.counts,backgroundColor:GREEN,borderRadius:4}]
    });

    const now = Date.now() - filterRatings.ms;
    const rFiltered = rawData.reviews.filter(r => {
      const t = r.createdAt?.seconds ? r.createdAt.seconds*1000 : 0;
      return t >= now;
    });
    const rDist = [1,2,3,4,5].map(r=>rFiltered.filter(rev=>Math.round(rev.rating||0)===r).length);
    make('chartRatings','doughnut',{
      labels:['1★','2★','3★','4★','5★'],
      datasets:[{data:rDist,backgroundColor:['#ef4444','#f97316','#eab308','#84cc16',GREEN],borderWidth:0,hoverOffset:6}]
    },{plugins:{legend:{position:'right',labels:{color:tick,font:{size:11}}}}});

    const cutoffCats = Date.now() - filterCats.ms;
    const bFiltered = rawData.businesses.filter(b => {
      const t = b.createdAt?.seconds ? b.createdAt.seconds*1000 : 0;
      return !b.createdAt || t >= cutoffCats;
    });
    const catMap = {};
    bFiltered.forEach(b => { const c=b.category||'other'; catMap[c]=(catMap[c]||0)+1; });
    const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,7);
    make('chartCategories','bar',{
      labels:topCats.map(([k])=>k),
      datasets:[{label:'Businesses',data:topCats.map(([,v])=>v),backgroundColor:[GREEN,AMBER,BLUE,'#8b5cf6','#ec4899','#06b6d4','#10b981'],borderRadius:4}]
    },{indexAxis:'y',plugins:{legend:{display:false}}});
  }, [rawData, filterUsers, filterReviews, filterRatings, filterCats, loading]);

  useEffect(() => {
    if (loading) return;
    const load = () => {
      if (!document.getElementById('chartjs-v9')) {
        const s = document.createElement('script');
        s.id = 'chartjs-v9';
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        s.onload = () => setTimeout(drawCharts, 50);
        document.head.appendChild(s);
      } else if (window.Chart) {
        setTimeout(drawCharts, 50);
      }
    };
    load();
  }, [drawCharts, loading]);

  const statCards = [
    { icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0', cls:'primary', label:t('admin.total_users'), val:stats.users, link:'/admin/users', trend:'+12%' },
    { icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10', cls:'success', label:t('admin.total_businesses'), val:stats.businesses, link:'/admin/businesses', trend:'+5%' },
    { icon:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', cls:'warning', label:t('admin.total_reviews'), val:stats.reviews, link:'/admin/reviews', trend:'+28%' },
    { icon:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', cls:'info', label:t('admin.avg_rating')||'Avg Rating', val:stats.avgRating||'—', link:'/admin/reviews', trend:null },
    { icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', cls:'danger', label:t('admin.pending_claims'), val:stats.claims, link:'/admin/claims', trend:null },
  ];

  const ChartFilter = ({ value, onChange }) => (
    <div className="ap-chart-time-filters">
      {TIME_FILTERS.map(f => (
        <button key={f.label} className={`ap-chart-tf-btn${value.label===f.label?' active':''}`} onClick={()=>onChange(f)}>{f.label}</button>
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="ap-page-header">
        <h1 className="ap-page-title">{t('admin.dashboard')}</h1>
        <div className="ap-header-actions">
          <Link to="/admin/analytics" className="ap-btn ap-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            {t('admin.analytics') || 'Analytics'}
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="ap-stats-grid-5">
        {statCards.map(s => (
          <div key={s.label} className="ap-stat-card ap-stat-clickable" onClick={()=>navigate(s.link)} role="button" tabIndex={0}>
            <div className={`ap-stat-icon ${s.cls}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={s.icon}/></svg>
            </div>
            <div className="ap-stat-value">{loading ? <span className="ap-skeleton-text"/> : s.val}</div>
            <div className="ap-stat-label">{s.label}</div>
            {s.trend && <span className="ap-stat-trend up">{s.trend}</span>}
            <div className="ap-stat-arrow">→</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="ap-charts-grid">
        <div className="ap-chart-card">
          <div className="ap-chart-header">
            <h3>User Growth</h3>
            <div className="ap-chart-header-right">
              <ChartFilter value={filterUsers} onChange={setFilterUsers} />
              <Link to="/admin/users" className="ap-chart-view-link">View all →</Link>
            </div>
          </div>
          <div className="ap-chart-canvas"><canvas id="chartUsers"></canvas></div>
        </div>

        <div className="ap-chart-card">
          <div className="ap-chart-header">
            <h3>{t('admin.reviews') || 'Reviews'} {t('admin.over_time') || 'Over Time'}</h3>
            <div className="ap-chart-header-right">
              <ChartFilter value={filterReviews} onChange={setFilterReviews} />
              <Link to="/admin/reviews" className="ap-chart-view-link">View all →</Link>
            </div>
          </div>
          <div className="ap-chart-canvas"><canvas id="chartReviews"></canvas></div>
        </div>

        <div className="ap-chart-card">
          <div className="ap-chart-header">
            <h3>Rating Distribution</h3>
            <div className="ap-chart-header-right">
              <ChartFilter value={filterRatings} onChange={setFilterRatings} />
              <Link to="/admin/reviews" className="ap-chart-view-link">View all →</Link>
            </div>
          </div>
          <div className="ap-chart-canvas"><canvas id="chartRatings"></canvas></div>
        </div>

        <div className="ap-chart-card">
          <div className="ap-chart-header">
            <h3>{t('admin.businesses') || 'Businesses'} {t('admin.by_category') || 'by Category'}</h3>
            <div className="ap-chart-header-right">
              <ChartFilter value={filterCats} onChange={setFilterCats} />
              <Link to="/admin/businesses" className="ap-chart-view-link">View all →</Link>
            </div>
          </div>
          <div className="ap-chart-canvas"><canvas id="chartCategories"></canvas></div>
        </div>
      </div>
    </AdminLayout>
  );
}
