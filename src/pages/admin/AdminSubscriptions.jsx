import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';
import './AdminIntegrations.css';

const STATUS_COLORS = { active: 'green', cancelled: 'red', expired: 'yellow', pending: 'blue', trial: 'teal' };

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 0, currency:'RWF', color:'#6b7280',
    tagline: 'Get started for free',
    features: [
      { label:'1 business listing', included:true },
      { label:'Up to 50 reviews/month', included:true },
      { label:'Basic analytics dashboard', included:true },
      { label:'Email notifications', included:true },
      { label:'Community badge', included:true },
      { label:'Reply to reviews', included:false },
      { label:'QR code downloads', included:false },
      { label:'Company Review Stories', included:false },
      { label:'Advanced analytics', included:false },
      { label:'AI sentiment analysis', included:false },
    ]
  },
  {
    id: 'professional', name: 'Professional', price: 25000, currency:'RWF', color:'#2d8f6f',
    tagline: 'For growing businesses',
    features: [
      { label:'1 business listing', included:true },
      { label:'Unlimited reviews', included:true },
      { label:'Advanced analytics + charts', included:true },
      { label:'Reply to reviews', included:true },
      { label:'Priority support', included:true },
      { label:'Verified badge', included:true },
      { label:'QR code downloads', included:true },
      { label:'Competitor insights', included:true },
      { label:'Company Review Stories', included:false },
      { label:'AI sentiment analysis', included:false },
    ]
  },
  {
    id: 'enterprise', name: 'Enterprise', price: 75000, currency:'RWF', color:'#7c3aed',
    tagline: 'Full power for top brands',
    features: [
      { label:'Up to 5 listings', included:true },
      { label:'Unlimited everything', included:true },
      { label:'AI sentiment analysis', included:true },
      { label:'Dedicated account manager', included:true },
      { label:'Custom integrations', included:true },
      { label:'White-label widgets', included:true },
      { label:'API access', included:true },
      { label:'SLA support', included:true },
      { label:'Company Review Stories ✨', included:true },
      { label:'Multi-location management', included:true },
    ]
  },
];

const ANALYTICS_TIERS = {
  free: {
    name: 'Free', price: 0, color: '#6b7280',
    metrics: ['avgRating', 'totalReviews', 'responseRate', 'reviewCountThisMonth', 'topComplaint', 'ratingDistribution']
  },
  middle: {
    name: 'Advanced', price: 15000, color: '#2d8f6f',
    metrics: ['avgRating', 'sentimentScore', 'competitorRank', 'topPraisedThemes', 'topComplaintThemes', 'seasonalTrends', 'staffQualityScore', 'pricePerceptionScore']
  },
  premium: {
    name: 'Professional', price: 45000, color: '#7c3aed',
    metrics: ['avgRating', 'aiRecommendations', 'menuOptimizationInsights', 'competitiveThreeatAnalysis', 'customerPersonaBreakdown', 'revenueImpactForecast', 'monthlyExecReport']
  }
};

const CATEGORIES = [
  'restaurant', 'bank', 'healthcare', 'retail', 'hotel', 'salon',
  'school', 'transport', 'technology', 'automotive', 'entertainment', 'real_estate', 'food_delivery'
];

export default function AdminSubscriptions() {
  const { t } = useTranslation();
  const { user: adminUser } = useAuthStore();
  const [subs, setSubs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('subscriptions');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewSub, setViewSub] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ businessId: '', plan: 'professional', status: 'active', trialDays: 0 });
  const [bizSearch, setBizSearch] = useState('');
  const [filteredBiz, setFilteredBiz] = useState([]);
  const [analyticsTierModal, setAnalyticsTierModal] = useState(false);
  const [analyticsTierForm, setAnalyticsTierForm] = useState({ businessId: '', category: '', tier: 'free' });
  const [analyticsBizSearch, setAnalyticsBizSearch] = useState('');
  const [analyticsFilteredBiz, setAnalyticsFilteredBiz] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  // Get features available for a plan tier
  const getFeaturesByPlan = (planId) => {
    const featureMap = {
      starter: {
        reply_reviews: false,
        analytics_advanced: false,
        qr_code: false,
        competitor_insights: false,
        verified_badge: false,
        multi_listing: false,
        ai_sentiment: false,
        api_access: false,
        white_label: false,
        priority_support: false,
      },
      professional: {
        reply_reviews: true,
        analytics_advanced: true,
        qr_code: true,
        competitor_insights: true,
        verified_badge: true,
        multi_listing: false,
        ai_sentiment: false,
        api_access: false,
        white_label: false,
        priority_support: true,
      },
      enterprise: {
        reply_reviews: true,
        analytics_advanced: true,
        qr_code: true,
        competitor_insights: true,
        verified_badge: true,
        multi_listing: true,
        ai_sentiment: true,
        api_access: true,
        white_label: true,
        priority_support: true,
      },
    };
    return featureMap[planId] || featureMap.starter;
  };

  const handleAssignSubscription = async () => {
    if (!assignForm.businessId || !assignForm.plan) {
      showToast('Please select a business and plan', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedBiz = businesses.find(b => b.id === assignForm.businessId);
      const plan = PLANS.find(p => p.id === assignForm.plan);

      // Calculate dates
      const createdAt = new Date();
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      let analyticsTrialEndsAt = null;
      if (assignForm.status === 'trial' && assignForm.trialDays > 0) {
        analyticsTrialEndsAt = new Date();
        analyticsTrialEndsAt.setDate(analyticsTrialEndsAt.getDate() + parseInt(assignForm.trialDays));
      }

      // Check if subscription exists
      const existingSub = subs.find(s => s.companyId === assignForm.businessId);

      const subData = {
        companyId: assignForm.businessId,
        businessName: selectedBiz?.companyName || selectedBiz?.name || 'Unknown',
        email: selectedBiz?.email || '',
        plan: assignForm.plan,
        amount: plan?.price || 0,
        status: assignForm.status,
        ...(assignForm.status === 'trial' && analyticsTrialEndsAt && { analyticsTrialEndsAt }),
        nextBillingDate,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email,
      };

      let subscriptionId = existingSub?.id;
      if (existingSub) {
        // Update existing
        await updateDoc(doc(db, 'subscriptions', existingSub.id), subData);
      } else {
        // Create new
        subData.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, 'subscriptions'), subData);
        subscriptionId = ref.id;
      }

      // Update company's enabledFeatures based on plan
      const enabledFeatures = getFeaturesByPlan(assignForm.plan);
      await updateDoc(doc(db, 'companies', assignForm.businessId), {
        enabledFeatures,
        subscriptionPlan: assignForm.plan,
        subscriptionId,
        updatedAt: serverTimestamp(),
      });

      // Log audit
      await addDoc(collection(db, 'audit_logs'), {
        action: 'subscription_assigned',
        detail: `Assigned ${assignForm.plan} tier to ${selectedBiz?.companyName || selectedBiz?.name}`,
        adminEmail: adminUser?.email,
        timestamp: serverTimestamp(),
      });

      // Reload subscriptions
      const updatedSubs = await getDocs(collection(db, 'subscriptions'));
      setSubs(updatedSubs.docs.map(d => ({ id: d.id, ...d.data() })));

      setAssignModal(false);
      setAssignForm({ businessId: '', plan: 'professional', status: 'active', trialDays: 0 });
      showToast(`Subscription assigned to ${selectedBiz?.companyName || selectedBiz?.name}`);
    } catch (e) {
      showToast(e.message, 'error');
      console.error(e);
    }
    setSaving(false);
  };

  const handleAssignAnalyticsTier = async () => {
    if (!analyticsTierForm.businessId || !analyticsTierForm.category) {
      showToast('Please select a business and category', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedBiz = businesses.find(b => b.id === analyticsTierForm.businessId);
      const existingSub = subs.find(s => s.companyId === analyticsTierForm.businessId);

      if (!existingSub) {
        showToast('Business must have a subscription first', 'error');
        setSaving(false);
        return;
      }

      // Update subscription with analytics tier
      const categoryTier = existingSub.analyticsCategoryTier || {};
      categoryTier[analyticsTierForm.category] = analyticsTierForm.tier;

      await updateDoc(doc(db, 'subscriptions', existingSub.id), {
        analyticsAccessLevel: analyticsTierForm.tier,
        analyticsCategoryTier: categoryTier,
        analyticsTrialEndsAt: null, // Clear trial date when admin assigns tier
        updatedAt: serverTimestamp(),
        updatedBy: adminUser?.email,
      });

      // Log audit
      await addDoc(collection(db, 'audit_logs'), {
        action: 'analytics_tier_assigned',
        detail: `Assigned ${analyticsTierForm.tier} analytics tier for ${analyticsTierForm.category} to ${selectedBiz?.companyName || selectedBiz?.name}`,
        adminEmail: adminUser?.email,
        timestamp: serverTimestamp(),
      });

      // Reload subscriptions
      const updatedSubs = await getDocs(collection(db, 'subscriptions'));
      setSubs(updatedSubs.docs.map(d => ({ id: d.id, ...d.data() })));

      setAnalyticsTierModal(false);
      setAnalyticsTierForm({ businessId: '', category: '', tier: 'free' });
      showToast(`Analytics tier assigned to ${selectedBiz?.companyName || selectedBiz?.name}`);
    } catch (e) {
      showToast(e.message, 'error');
      console.error(e);
    }
    setSaving(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const [sSnap, pSnap, bSnap] = await Promise.all([
          getDocs(collection(db, 'subscriptions')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'payments')).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'companies')).catch(() => ({ docs: [] })),
        ]);
        setSubs(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setBusinesses(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const filteredSubs = subs.filter(s => {
    const matchSearch = !search || (s.businessName || s.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPayments = payments.filter(p =>
    !search || (p.businessName || p.email || p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Features to set when a subscription is cancelled or expired (strips all premium features)
  const getStarterFeatures = (existingFeatures) => ({
    reply_reviews: false,
    analytics_advanced: false,
    qr_code: false,
    competitor_insights: false,
    verified_badge: false,
    multi_listing: false,
    ai_sentiment: false,
    api_access: false,
    white_label: false,
    priority_support: false,
    product_listings: false,
    company_stories: existingFeatures?.company_stories || false,
  });

  const handleCancel = async () => {
    if (!cancelConfirm) return;
    console.log('[AdminSubscriptions] Cancelling:', cancelConfirm);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'subscriptions', cancelConfirm.id), {
        status: 'cancelled',
        analyticsAccessLevel: 'free',
        locked: true,
        cancelledAt: serverTimestamp(),
        cancelledBy: adminUser?.email
      });
      console.log('[AdminSubscriptions] Subscription cancelled, now clearing enabledFeatures');
      // Clear enabledFeatures so premium access is immediately revoked
      await updateDoc(doc(db, 'companies', cancelConfirm.companyId), {
        enabledFeatures: getStarterFeatures(cancelConfirm.enabledFeatures),
        subscriptionPlan: 'starter',
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'audit_logs'), {
        action: 'subscription_cancelled',
        detail: `Cancelled subscription for ${cancelConfirm.businessName || cancelConfirm.email}`,
        adminEmail: adminUser?.email, timestamp: serverTimestamp()
      });
      setSubs(prev => prev.map(s => s.id === cancelConfirm.id ? { ...s, status: 'cancelled' } : s));
      setCancelConfirm(null);
      showToast('Subscription cancelled');
    } catch (e) {
      console.error('[AdminSubscriptions] Cancel failed:', e);
      showToast(e.message, 'error');
    }
    setSaving(false);
  };

  const handleRenew = async (sub) => {
    try {
      const renewDate = new Date();
      renewDate.setMonth(renewDate.getMonth() + 1);
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'active', renewedAt: serverTimestamp(), nextBillingDate: renewDate
      });
      setSubs(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'active' } : s));
      showToast('Subscription renewed successfully');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const formatDate = ts => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds * 1000) : null;
    return d ? d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  };

  const totalMRR = subs.filter(s => s.status === 'active').reduce((acc, s) => acc + (s.amount || PLANS.find(p => p.id === s.plan)?.price || 0), 0);
  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type === 'success' ? '✓' : '✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <h1 className="ap-page-title">{t('admin.subscriptions_title')||'Subscriptions & Payments'}</h1>
      </div>

      {/* Summary KPIs */}
      <div className="ap-subs-kpis">
        <div className="ap-sub-kpi">
          <span className="ap-sub-kpi-val">{subs.filter(s => s.status === 'active').length}</span>
          <span className="ap-sub-kpi-label">Active Subscriptions</span>
        </div>
        <div className="ap-sub-kpi green">
          <span className="ap-sub-kpi-val">{totalMRR.toLocaleString()} RWF</span>
          <span className="ap-sub-kpi-label">Est. Monthly Revenue</span>
        </div>
        <div className="ap-sub-kpi blue">
          <span className="ap-sub-kpi-val">{subs.filter(s => s.status === 'trial').length}</span>
          <span className="ap-sub-kpi-label">On Trial</span>
        </div>
        <div className="ap-sub-kpi yellow">
          <span className="ap-sub-kpi-val">{subs.filter(s => s.status === 'cancelled').length}</span>
          <span className="ap-sub-kpi-label">Cancelled</span>
        </div>
        <div className="ap-sub-kpi purple">
          <span className="ap-sub-kpi-val">{totalRevenue.toLocaleString()} RWF</span>
          <span className="ap-sub-kpi-label">Total Revenue</span>
        </div>
      </div>

      {/* Plans — clean card layout matching business subscription page */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20,marginBottom:32,opacity:loading?0:1,transition:'opacity 0.3s'}}>
        {PLANS.map(plan => {
          const count = subs.filter(s => s.plan === plan.id && s.status === 'active').length;
          const isPro = plan.id === 'professional';
          return (
            <div key={plan.id} style={{
              background:'var(--surface)', borderRadius:16, padding:'24px 22px',
              border:`1px solid ${isPro ? plan.color : 'var(--border)'}`,
              borderTop:`4px solid ${plan.color}`,
              boxShadow: isPro ? `0 4px 24px ${plan.color}20` : '0 1px 4px rgba(0,0,0,0.04)',
              position:'relative'
            }}>
              {isPro && (
                <div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',
                  background:plan.color,color:'white',fontSize:'0.62rem',fontWeight:700,
                  padding:'4px 14px',borderRadius:99,letterSpacing:'0.1em',whiteSpace:'nowrap'}}>
                  MOST POPULAR
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontWeight:800,fontSize:'1.1rem',color:'var(--text-1)'}}>{plan.name}</span>
                <span style={{background:`${plan.color}18`,color:plan.color,fontSize:'0.72rem',fontWeight:700,padding:'3px 10px',borderRadius:99}}>
                  {count} active
                </span>
              </div>
              <div style={{fontSize:'0.75rem',color:'var(--text-4)',fontStyle:'italic',marginBottom:10}}>{plan.tagline}</div>
              <div style={{fontSize:plan.price===0?'1.2rem':'1.8rem',fontWeight:800,color:plan.color,marginBottom:plan.price>0?2:12}}>
                {plan.price === 0 ? 'Free' : <>{plan.price.toLocaleString()} <span style={{fontSize:'0.8rem',fontWeight:500,color:'var(--text-3)'}}>RWF/mo</span></>}
              </div>
              {plan.price > 0 && <div style={{fontSize:'0.72rem',color:'var(--text-4)',marginBottom:14}}>≈ ${Math.round(plan.price/1300)}/mo USD</div>}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
                {plan.features.map(f => (
                  <div key={f.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,
                    fontSize:'0.8rem',color:f.included?'var(--text-2)':'var(--text-4)',opacity:f.included?1:0.5}}>
                    <span style={{width:14,height:14,borderRadius:'50%',
                      background:f.included?`${plan.color}20`:'transparent',
                      border:`1px solid ${f.included?plan.color:'#d1d5db'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      flexShrink:0,fontSize:'0.6rem',color:f.included?plan.color:'#d1d5db',fontWeight:700}}>
                      {f.included?'✓':'✕'}
                    </span>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="ap-status-tabs" style={{ marginBottom: 'var(--sp-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`ap-status-tab${tab === 'subscriptions' ? ' active' : ''}`} onClick={() => setTab('subscriptions')}>
            Subscriptions <span className="ap-tab-count">{subs.length}</span>
          </button>
          <button className={`ap-status-tab${tab === 'payments' ? ' active' : ''}`} onClick={() => setTab('payments')}>
            Payment History <span className="ap-tab-count">{payments.length}</span>
          </button>
          <button className={`ap-status-tab${tab === 'analytics' ? ' active' : ''}`} onClick={() => setTab('analytics')}>
            Analytics Tiers <span className="ap-tab-count">{subs.length}</span>
          </button>
        </div>
        {tab === 'subscriptions' && (
          <button className="ap-btn ap-btn-primary" onClick={() => setAssignModal(true)}>
            + Assign Subscription
          </button>
        )}
        {tab === 'analytics' && (
          <button className="ap-btn ap-btn-primary" onClick={() => setAnalyticsTierModal(true)}>
            + Assign Analytics Tier
          </button>
        )}
      </div>

      <div className="ap-table-wrap">
        <div className="ap-table-toolbar ap-toolbar-multi">
          <div className="ap-table-search">
            <svg className="ap-table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input placeholder={t('admin.search_subs')||`Search ${tab}…`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {tab === 'subscriptions' && (
            <select className="ap-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          )}
          <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={() => { setSearch(''); setStatusFilter(''); }}>↺ Reset</button>
        </div>

        {tab === 'analytics' ? (
          <table className="ap-table">
            <thead><tr><th>{t('admin.business')||'Business'}</th><th>Category</th><th>Current Tier</th><th style={{ textAlign: 'right' }}>{t('admin.actions')||'Actions'}</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="ap-loading-cell"><div className="ap-spinner" /></td></tr>
                : subs.length === 0 ? (
                  <tr><td colSpan="4" className="ap-empty">
                    No subscriptions yet — assign subscription tiers first before managing analytics
                  </td></tr>
                ) : (
                  subs.flatMap(s =>
                    CATEGORIES.map(cat => (
                      <tr key={`${s.id}-${cat}`} className="ap-tr-hover">
                        <td className="ap-td-bold">{s.businessName || s.email || '—'}</td>
                        <td><span className="ap-badge gray">{cat}</span></td>
                        <td>
                          <span style={{
                            padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
                            background: ANALYTICS_TIERS[s.analyticsCategoryTier?.[cat] || 'free']?.color + '20',
                            color: ANALYTICS_TIERS[s.analyticsCategoryTier?.[cat] || 'free']?.color
                          }}>
                            {ANALYTICS_TIERS[s.analyticsCategoryTier?.[cat] || 'free']?.name}
                          </span>
                        </td>
                        <td>
                          <div className="ap-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button className="ap-icon-action-btn" title="Upgrade Tier" onClick={() => {
                              setAnalyticsTierForm({ businessId: s.companyId, category: cat, tier: s.analyticsCategoryTier?.[cat] || 'free' });
                              setAnalyticsTierModal(true);
                            }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
            </tbody>
          </table>
        ) : tab === 'subscriptions' ? (
          <table className="ap-table">
            <thead><tr><th>{t('admin.business')||'Business'}</th><th>{t('admin.plan')||'Plan'}</th><th>{t('admin.status')||'Status'}</th><th>{t('admin.amount')||'Amount'}</th><th>Next Billing</th><th>Started</th><th style={{ textAlign: 'right' }}>{t('admin.actions')||'Actions'}</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="ap-loading-cell"><div className="ap-spinner" /></td></tr>
                : filteredSubs.length === 0 ? (
                  <tr><td colSpan="7" className="ap-empty">
                    {subs.length === 0 ? 'No subscriptions yet — add a "subscriptions" collection to Firestore to get started.' : 'No subscriptions match filters'}
                  </td></tr>
                ) : filteredSubs.map(s => (
                  <tr key={s.id} className="ap-tr-hover">
                    <td className="ap-td-bold">{s.businessName || s.email || '—'}</td>
                    <td><span className="ap-badge blue">{s.plan || 'pro'}</span></td>
                    <td><span className={`ap-badge ${STATUS_COLORS[s.status] || 'gray'}`}>{s.status || 'active'}</span></td>
                    <td style={{ fontWeight: 700 }}>{(() => { const p = s.amount || PLANS.find(pl => pl.id === s.plan)?.price; return p ? p.toLocaleString()+' RWF/mo' : '—'; })()}</td>
                    <td className="ap-td-date">{formatDate(s.nextBillingDate)}</td>
                    <td className="ap-td-date">{formatDate(s.createdAt)}</td>
                    <td>
                      <div className="ap-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="ap-icon-action-btn" title="View" onClick={() => setViewSub(s)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        {s.status === 'cancelled' || s.status === 'expired' ? (
                          <button className="ap-icon-action-btn success" title="Renew" onClick={() => handleRenew(s)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                          </button>
                        ) : (
                          <button className="ap-icon-action-btn danger" title="Cancel" onClick={() => setCancelConfirm(s)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <table className="ap-table">
            <thead><tr><th>{t('admin.business')||'Business'}</th><th>Description</th><th>{t('admin.amount')||'Amount'}</th><th>Method</th><th>{t('admin.status')||'Status'}</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="6" className="ap-loading-cell"><div className="ap-spinner" /></td></tr>
                : filteredPayments.length === 0 ? (
                  <tr><td colSpan="6" className="ap-empty">
                    {payments.length === 0 ? 'No payment records yet — add a "payments" collection to Firestore.' : 'No payments match search'}
                  </td></tr>
                ) : filteredPayments.map(p => (
                  <tr key={p.id} className="ap-tr-hover">
                    <td className="ap-td-bold">{p.businessName || p.email || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{p.description || p.plan || '—'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--brand)' }}>{(p.amount || 0).toLocaleString()} RWF</td>
                    <td><span className="ap-badge gray">{p.method || p.provider || 'card'}</span></td>
                    <td><span className={`ap-badge ${p.status === 'paid' || p.status === 'success' ? 'green' : p.status === 'failed' ? 'red' : 'yellow'}`}>{p.status || 'paid'}</span></td>
                    <td className="ap-td-date">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        <div className="ap-table-footer">
          <span>Showing {tab === 'subscriptions' ? filteredSubs.length : filteredPayments.length} records</span>
        </div>
      </div>

      {/* View Subscription Modal */}
      {viewSub && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setViewSub(null)}>
          <div className="ap-modal">
            <div className="ap-modal-header"><h3>Subscription Details</h3><button className="ap-modal-close" onClick={() => setViewSub(null)}>✕</button></div>
            <div className="ap-report-detail">
              <div className="ap-report-row"><span>{t('admin.business')||'Business'}</span><strong>{viewSub.businessName || viewSub.email || '—'}</strong></div>
              <div className="ap-report-row"><span>{t('admin.plan')||'Plan'}</span><span className="ap-badge blue">{viewSub.plan || 'pro'}</span></div>
              <div className="ap-report-row"><span>{t('admin.status')||'Status'}</span><span className={`ap-badge ${STATUS_COLORS[viewSub.status] || 'gray'}`}>{viewSub.status}</span></div>
              <div className="ap-report-row"><span>{t('admin.amount')||'Amount'}</span><strong>{viewSub.amount ? viewSub.amount.toLocaleString()+' RWF/mo' : '—'}</strong></div>
              <div className="ap-report-row"><span>Started</span><strong>{formatDate(viewSub.createdAt)}</strong></div>
              <div className="ap-report-row"><span>Next Billing</span><strong>{formatDate(viewSub.nextBillingDate)}</strong></div>
              {viewSub.cancelledAt && <div className="ap-report-row"><span>Cancelled</span><strong>{formatDate(viewSub.cancelledAt)}</strong></div>}
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setViewSub(null)}>Close</button>
              {viewSub.status === 'active' && <button className="ap-btn ap-btn-danger" onClick={() => { setViewSub(null); setCancelConfirm(viewSub); }}>Cancel Subscription</button>}
              {(viewSub.status === 'cancelled' || viewSub.status === 'expired') && <button className="ap-btn ap-btn-primary" onClick={() => { handleRenew(viewSub); setViewSub(null); }}>Renew</button>}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm */}
      {cancelConfirm && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setCancelConfirm(null)}>
          <div className="ap-modal ap-modal-sm">
            <div className="ap-modal-header"><h3>Cancel Subscription</h3><button className="ap-modal-close" onClick={() => setCancelConfirm(null)}>✕</button></div>
            <div className="ap-danger-box">
              <div className="ap-danger-icon">⚠️</div>
              <div><strong>Cancel this subscription?</strong><p>Cancel subscription for <strong>{cancelConfirm.businessName || cancelConfirm.email}</strong>. They will lose access at the end of their billing period.</p></div>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setCancelConfirm(null)}>Keep Active</button>
              <button className="ap-btn ap-btn-danger" onClick={handleCancel} disabled={saving}>{saving ? 'Cancelling…' : 'Cancel Subscription'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tier Assignment Modal */}
      {analyticsTierModal && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setAnalyticsTierModal(false)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Assign Analytics Tier</h3>
              <button className="ap-modal-close" onClick={() => setAnalyticsTierModal(false)}>✕</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Business Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                  Select Business (must have active subscription)
                </label>
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={analyticsBizSearch}
                  onChange={(e) => {
                    setAnalyticsBizSearch(e.target.value);
                    const filtered = subs.filter(s =>
                      (s.businessName || s.email || '').toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    setAnalyticsFilteredBiz(filtered);
                  }}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                {analyticsBizSearch && analyticsFilteredBiz.length > 0 && (
                  <div style={{
                    marginTop: 8, border: '1px solid var(--border)', borderRadius: 8,
                    maxHeight: 200, overflowY: 'auto', background: 'var(--bg)'
                  }}>
                    {analyticsFilteredBiz.map(biz => (
                      <div
                        key={biz.id}
                        onClick={() => {
                          setAnalyticsTierForm({ ...analyticsTierForm, businessId: biz.companyId });
                          setAnalyticsBizSearch('');
                          setAnalyticsFilteredBiz([]);
                        }}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s', backgroundColor: analyticsTierForm.businessId === biz.companyId ? 'var(--brand-xlight)' : 'transparent'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = analyticsTierForm.businessId === biz.companyId ? 'var(--brand-xlight)' : 'transparent'; }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{biz.businessName || biz.email}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{biz.plan} plan</div>
                      </div>
                    ))}
                  </div>
                )}
                {analyticsTierForm.businessId && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--brand-xlight)', borderRadius: 6, color: 'var(--brand)', fontWeight: 600 }}>
                    ✓ {subs.find(s => s.companyId === analyticsTierForm.businessId)?.businessName || 'Selected'}
                  </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                  Business Category
                </label>
                <select
                  value={analyticsTierForm.category}
                  onChange={(e) => setAnalyticsTierForm({ ...analyticsTierForm, category: e.target.value })}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Tier Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-1)' }}>
                  Analytics Tier
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  {Object.entries(ANALYTICS_TIERS).map(([tierId, tier]) => (
                    <div
                      key={tierId}
                      onClick={() => setAnalyticsTierForm({ ...analyticsTierForm, tier: tierId })}
                      style={{
                        padding: 14, border: `2px solid ${analyticsTierForm.tier === tierId ? tier.color : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                        background: analyticsTierForm.tier === tierId ? `${tier.color}10` : 'var(--bg)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: tier.color, fontWeight: 700, fontSize: '0.95rem' }}>{tier.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                          {tier.price === 0 ? 'Free' : tier.price.toLocaleString() + ' RWF'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                        <strong>Metrics ({tier.metrics.length}):</strong>
                        <div style={{ marginTop: 4 }}>{tier.metrics.slice(0, 3).join(', ')}{tier.metrics.length > 3 ? '...' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {analyticsTierForm.businessId && analyticsTierForm.category && (
                <div style={{
                  padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: '0.85rem',
                  color: 'var(--text-2)', borderLeft: '3px solid var(--brand)'
                }}>
                  <strong>Summary:</strong>
                  <div style={{ marginTop: 8 }}>
                    • <strong>{subs.find(s => s.companyId === analyticsTierForm.businessId)?.businessName}</strong> will get <strong>{ANALYTICS_TIERS[analyticsTierForm.tier]?.name}</strong> analytics for <strong>{analyticsTierForm.category}</strong>
                  </div>
                  <div>• {ANALYTICS_TIERS[analyticsTierForm.tier]?.metrics.length} metrics will be available</div>
                </div>
              )}
            </div>

            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setAnalyticsTierModal(false)}>Cancel</button>
              <button
                className="ap-btn ap-btn-primary"
                onClick={handleAssignAnalyticsTier}
                disabled={saving || !analyticsTierForm.businessId || !analyticsTierForm.category}
              >
                {saving ? 'Assigning…' : 'Assign Analytics Tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Subscription Modal */}
      {assignModal && (
        <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && setAssignModal(false)}>
          <div className="ap-modal">
            <div className="ap-modal-header">
              <h3>Assign Subscription to Business</h3>
              <button className="ap-modal-close" onClick={() => setAssignModal(false)}>✕</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Business Search */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                  Select Business
                </label>
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={bizSearch}
                  onChange={(e) => {
                    setBizSearch(e.target.value);
                    const filtered = businesses.filter(b =>
                      (b.companyName || b.name || '').toLowerCase().includes(e.target.value.toLowerCase()) ||
                      (b.email || '').toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    setFilteredBiz(filtered);
                  }}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box'
                  }}
                />
                {bizSearch && filteredBiz.length > 0 && (
                  <div style={{
                    marginTop: 8, border: '1px solid var(--border)', borderRadius: 8,
                    maxHeight: 200, overflowY: 'auto', background: 'var(--bg)'
                  }}>
                    {filteredBiz.map(biz => (
                      <div
                        key={biz.id}
                        onClick={() => {
                          setAssignForm({ ...assignForm, businessId: biz.id });
                          setBizSearch('');
                          setFilteredBiz([]);
                        }}
                        style={{
                          padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s', backgroundColor: assignForm.businessId === biz.id ? 'var(--brand-xlight)' : 'transparent'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = assignForm.businessId === biz.id ? 'var(--brand-xlight)' : 'transparent'; }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{biz.companyName || biz.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{biz.email}</div>
                      </div>
                    ))}
                  </div>
                )}
                {assignForm.businessId && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--brand-xlight)', borderRadius: 6, color: 'var(--brand)', fontWeight: 600 }}>
                    ✓ {businesses.find(b => b.id === assignForm.businessId)?.companyName || 'Selected'}
                  </div>
                )}
              </div>

              {/* Plan Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                  Subscription Plan
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {PLANS.map(plan => (
                    <div
                      key={plan.id}
                      onClick={() => setAssignForm({ ...assignForm, plan: plan.id })}
                      style={{
                        padding: 12, border: `2px solid ${assignForm.plan === plan.id ? plan.color : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                        background: assignForm.plan === plan.id ? `${plan.color}10` : 'var(--bg)',
                        fontSize: '0.9rem', fontWeight: assignForm.plan === plan.id ? 700 : 500
                      }}
                    >
                      <div style={{ color: plan.color, fontWeight: 700 }}>{plan.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 4 }}>
                        {plan.price === 0 ? 'Free' : plan.price.toLocaleString() + ' RWF'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                  Status
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['active', 'trial', 'pending'].map(status => (
                    <button
                      key={status}
                      onClick={() => setAssignForm({ ...assignForm, status })}
                      style={{
                        flex: 1, padding: '8px 12px', border: `1px solid ${assignForm.status === status ? '#2d8f6f' : 'var(--border)'}`,
                        background: assignForm.status === status ? '#2d8f6f' : 'var(--bg)',
                        color: assignForm.status === status ? 'white' : 'var(--text-1)',
                        borderRadius: 6, cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s'
                      }}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trial Days (if trial status) */}
              {assignForm.status === 'trial' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-1)' }}>
                    Trial Duration (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={assignForm.trialDays}
                    onChange={(e) => setAssignForm({ ...assignForm, trialDays: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
                      borderRadius: 6, fontSize: '0.9rem', boxSizing: 'border-box'
                    }}
                    placeholder="14"
                  />
                </div>
              )}

              {/* Summary */}
              {assignForm.businessId && assignForm.plan && (
                <div style={{
                  padding: 12, background: 'var(--bg)', borderRadius: 8, fontSize: '0.85rem',
                  color: 'var(--text-2)', borderLeft: '3px solid var(--brand)'
                }}>
                  <strong>Summary:</strong>
                  <div style={{ marginTop: 8 }}>
                    • <strong>{businesses.find(b => b.id === assignForm.businessId)?.companyName || 'Selected business'}</strong> will be assigned to <strong>{PLANS.find(p => p.id === assignForm.plan)?.name}</strong> plan
                  </div>
                  <div>• All features for this tier will be unlocked</div>
                  <div>• Status: <strong>{assignForm.status}</strong></div>
                  {assignForm.status === 'trial' && assignForm.trialDays && (
                    <div>• Trial duration: <strong>{assignForm.trialDays} days</strong></div>
                  )}
                </div>
              )}
            </div>

            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={() => setAssignModal(false)}>Cancel</button>
              <button
                className="ap-btn ap-btn-primary"
                onClick={handleAssignSubscription}
                disabled={saving || !assignForm.businessId || !assignForm.plan}
              >
                {saving ? 'Assigning…' : 'Assign Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
