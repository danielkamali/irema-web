import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import AdminLayout from './AdminLayout';
import ReviewModal from '../../components/ReviewModal';
import './AdminPages.css';

const Stars = ({rating, size=14}) => (
  <span style={{display:'inline-flex',gap:1}}>
    {[1,2,3,4,5].map(i=><span key={i} style={{fontSize:size,color:i<=Math.round(rating||0)?'#e8b800':'#d1d5db'}}>★</span>)}
  </span>
);

function Toast({msg,type,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3200);return()=>clearTimeout(t);},[]);
  return <div className={`ap-toast ap-toast-${type}`}>{type==='success'?'✓':'✗'} {msg}</div>;
}

/* ── Company review widget card ── */
function CompanyReviewWidget({ company, onSelect }) {
  const banner = company.photos?.[0] || null;
  const avgRating = company.reviews.reduce((s,r)=>s+(r.rating||0),0) / Math.max(company.reviews.length,1);
  const adminComments = company.reviews.filter(r=>(r.replies||[]).some(p=>p.isAdminComment)).length;

  return (
    <div className="ap-biz-review-card" onClick={() => onSelect(company)} role="button" tabIndex={0}
      onKeyDown={e=>e.key==='Enter'&&onSelect(company)}>
      {/* Banner */}
      <div className="ap-biz-review-banner" style={banner ? {backgroundImage:`url(${banner})`} : {}}>
        {!banner && <div className="ap-biz-review-initial">{(company.name||'?')[0].toUpperCase()}</div>}
        <div className="ap-biz-review-overlay" />
        <div className="ap-biz-review-badge-wrap">
          <span className="ap-biz-review-count-badge">{company.reviews.length} review{company.reviews.length!==1?'s':''}</span>
          {adminComments > 0 && <span className="ap-biz-admin-badge">💬 {adminComments} admin</span>}
        </div>
      </div>
      {/* Card body */}
      <div className="ap-biz-review-body">
        <div className="ap-biz-review-name">{company.name}</div>
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
          <Stars rating={avgRating} size={13}/>
          <span style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text-2)'}}>{avgRating.toFixed(1)}</span>
        </div>
        <div className="ap-biz-review-meta">
          <span>{company.category||'—'}</span>
          <span style={{color:'var(--brand)',fontWeight:600}}>View reviews →</span>
        </div>
      </div>
    </div>
  );
}

/* ── Review widget card — click to open modal ── */
const AVATAR_COLORS_ADMIN = ['#2d8f6f','#0ea5e9','#8b5cf6','#f59e0b','#ef4444','#14b8a6'];
function ReviewWidgetCard({ review, onClick }) {
  const name = review.userName||'Anonymous';
  const color = AVATAR_COLORS_ADMIN[name.charCodeAt(0) % AVATAR_COLORS_ADMIN.length];
  const firstImage = review.images?.[0];
  const timeAgo = (() => {
    const ts = review.createdAt;
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : ts.seconds ? new Date(ts.seconds*1000) : null;
    if (!d) return '';
    const diff = Date.now()-d.getTime(), hrs=Math.floor(diff/3600000), days=Math.floor(diff/86400000), wks=Math.floor(diff/604800000);
    if (diff<60000) return 'just now';
    if (hrs<1) return `${Math.floor(diff/60000)} min ago`;
    if (hrs<24) return `${hrs}h ago`;
    if (days<7) return days===1?'yesterday':`${days} days ago`;
    if (wks<5) return `${wks} week${wks>1?'s':''} ago`;
    return d.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
  })();
  const hasReplies = (review.replies||[]).length > 0;

  return (
    <div onClick={onClick} style={{
      background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,
      padding:20,cursor:'pointer',transition:'box-shadow 0.18s,transform 0.18s',
      display:'flex',flexDirection:'column',gap:10,
    }}
    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.09)';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor='var(--brand-light)';}}
    onMouseLeave={e=>{e.currentTarget.style.boxShadow='';e.currentTarget.style.transform='';e.currentTarget.style.borderColor='var(--border)';}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:36,height:36,borderRadius:'50%',background:color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'0.88rem',flexShrink:0}}>
          {name[0].toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:'0.88rem',color:'var(--text-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
          <div style={{fontSize:'0.72rem',color:'var(--text-4)'}}>{timeAgo}</div>
        </div>
        <Stars rating={review.rating} size={14}/>
      </div>
      {/* Comment */}
      {review.comment && (
        <p style={{margin:0,fontSize:'0.86rem',color:'var(--text-2)',lineHeight:1.55,
          display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
          {review.comment}
        </p>
      )}
      {/* First image thumbnail */}
      {firstImage && <img src={firstImage} alt="" style={{width:'100%',height:80,objectFit:'cover',borderRadius:8}}/>}
      {/* Footer */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:8,marginTop:'auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.75rem',color:'var(--text-3)'}}>
          <div style={{width:22,height:22,borderRadius:5,background:'var(--brand-xlight)',color:'var(--brand)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'0.7rem'}}>
            {(review.companyName||'?')[0].toUpperCase()}
          </div>
          <span style={{fontWeight:600,color:'var(--text-2)'}}>{review.companyName||'—'}</span>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {hasReplies && <span style={{fontSize:'0.7rem',background:'var(--bg-2)',color:'var(--text-3)',padding:'2px 8px',borderRadius:99}}>💬 {(review.replies||[]).length}</span>}
          <span style={{fontSize:'0.72rem',color:'var(--brand)',fontWeight:600}}>View →</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const { user } = useAuthStore();
  const { can } = useAdminPermissions();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [commentingOn, setCommentingOn] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg,type='success') => { setToast({msg,type}); };

  useEffect(() => {
    (async () => {
      try {
        const [revSnap, bizSnap] = await Promise.all([
          getDocs(collection(db,'reviews')),
          getDocs(collection(db,'companies')),
        ]);
        const revData = revSnap.docs.map(d=>({id:d.id,...d.data()}));
        revData.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
        setReviews(revData);
        // Build company map with photos
        const bizMap = {};
        bizSnap.docs.forEach(d => { bizMap[d.id] = {id:d.id,...d.data()}; });
        // Group reviews by company, attaching company photos
        const compMap = {};
        revData.forEach(r => {
          const cid = r.companyId;
          if (!cid) return;
          if (!compMap[cid]) {
            const biz = bizMap[cid] || {};
            compMap[cid] = { id:cid, name:r.companyName||biz.companyName||biz.name||'Unknown', reviews:[], photos:biz.photos||[], category:biz.category||'', logoUrl:biz.logoUrl||'' };
          }
          compMap[cid].reviews.push(r);
        });
        setCompanies(Object.values(compMap).sort((a,b)=>b.reviews.length-a.reviews.length));
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  // Filtered companies
  const filteredCompanies = companies.filter(c => {
    if (!search && !ratingFilter) return true;
    const nameMatch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const ratingMatch = !ratingFilter || c.reviews.some(r=>Math.round(r.rating||0)===parseInt(ratingFilter));
    return nameMatch && ratingMatch;
  });

  // Filtered reviews for selected company
  const selectedReviews = selectedCompany
    ? selectedCompany.reviews.filter(r => {
        const ratingMatch = !ratingFilter || Math.round(r.rating||0)===parseInt(ratingFilter);
        const searchMatch = !search || (r.comment||'').toLowerCase().includes(search.toLowerCase()) || (r.userName||'').toLowerCase().includes(search.toLowerCase());
        return ratingMatch && searchMatch;
      })
    : [];

  async function logAudit(action, detail) {
    try { await addDoc(collection(db,'audit_logs'),{action,detail,adminEmail:user?.email,adminId:user?.uid,timestamp:serverTimestamp()}); } catch {}
  }

  const doDelete = async () => {
    if (!deleteReviewId) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db,'reviews',deleteReviewId));
      await logAudit('delete_review',`Deleted review ${deleteReviewId}`);
      setReviews(prev=>prev.filter(r=>r.id!==deleteReviewId));
      if (selectedCompany) {
        setSelectedCompany(prev=>({...prev,reviews:prev.reviews.filter(r=>r.id!==deleteReviewId)}));
      }
      setDeleteReviewId(null); showToast('Review deleted');
    } catch(e) { showToast(e.message,'error'); }
    setSaving(false);
  };

  const submitComment = async () => {
    if (!adminComment.trim()||!commentingOn) return;
    setSaving(true);
    try {
      const rev = reviews.find(r=>r.id===commentingOn);
      const newReply = { by:'admin', text:adminComment.trim(), userId:user?.uid, userName:`Admin: ${user?.displayName||user?.email?.split('@')[0]||'Admin'}`, when:new Date().toISOString(), isAdminComment:true };
      const updatedReplies = [...(rev?.replies||[]), newReply];
      await updateDoc(doc(db,'reviews',commentingOn),{replies:updatedReplies});
      await logAudit('admin_comment',`Commented on review ${commentingOn}`);
      setReviews(prev=>prev.map(r=>r.id===commentingOn?{...r,replies:updatedReplies}:r));
      if (selectedCompany) {
        setSelectedCompany(prev=>({...prev,reviews:prev.reviews.map(r=>r.id===commentingOn?{...r,replies:updatedReplies}:r)}));
      }
      setCommentingOn(null); setAdminComment(''); showToast('Comment posted');
    } catch(e) { showToast(e.message,'error'); }
    setSaving(false);
  };

  function handleExport() {
    const allRevs = reviews;
    const csv = [['User','Business','Rating','Review','Date'].join(','),
      ...allRevs.map(r=>[r.userName,r.companyName,r.rating,`"${(r.comment||'').replace(/"/g,'""')}"`,r.createdAt?.seconds?new Date(r.createdAt.seconds*1000).toLocaleDateString():''  ].join(','))
    ].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `reviews_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    showToast(`Exported ${allRevs.length} reviews`);
  }

  return (
    <AdminLayout>
      {toast && <Toast {...toast} onClose={()=>setToast(null)}/>}

      <div className="ap-page-header">
        <h1 className="ap-page-title">Reviews</h1>
        <div className="ap-header-actions">
          {selectedCompany && (
            <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={()=>setSelectedCompany(null)}>
              ← All Businesses
            </button>
          )}
          <button className="ap-btn ap-btn-ghost ap-btn-sm" onClick={()=>{setSearch('');setRatingFilter('');}}>↺ Reset</button>
          <button className="ap-btn ap-btn-secondary" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="ap-table-toolbar ap-toolbar-multi" style={{marginBottom:24}}>
        <div className="ap-table-search">
          <svg className="ap-table-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input placeholder={selectedCompany ? `Search reviews for ${selectedCompany.name}…` : "Search businesses…"} value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="ap-filter-select" value={ratingFilter} onChange={e=>setRatingFilter(e.target.value)}>
          <option value="">All Ratings</option>
          {[5,4,3,2,1].map(r=><option key={r} value={r}>{r} Stars</option>)}
        </select>
        <span className="ap-count-badge">
          {selectedCompany ? `${selectedReviews.length} reviews` : `${filteredCompanies.length} businesses · ${reviews.length} reviews`}
        </span>
      </div>

      {loading ? (
        <div style={{padding:'60px',textAlign:'center'}}><div className="ap-spinner"/></div>
      ) : selectedCompany ? (
        /* ── Company detail view ── */
        <div>
          {/* Company header */}
          <div className="ap-biz-detail-header" style={{backgroundImage:selectedCompany.photos?.[0]?`url(${selectedCompany.photos[0]})`:'none'}}>
            <div className="ap-biz-detail-overlay"/>
            <div className="ap-biz-detail-info">
              <div className="ap-biz-detail-initial">{selectedCompany.name[0].toUpperCase()}</div>
              <div>
                <h2 style={{margin:0,color:'white',fontWeight:800}}>{selectedCompany.name}</h2>
                <div style={{color:'rgba(255,255,255,0.8)',fontSize:'0.85rem'}}>{selectedCompany.category} · {selectedCompany.reviews.length} reviews</div>
              </div>
            </div>
          </div>
          {/* Reviews as clickable widget cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16,padding:'24px 0'}}>
            {selectedReviews.length === 0 ? (
              <div className="ap-empty" style={{padding:40,gridColumn:'1/-1'}}>No reviews match your filter</div>
            ) : selectedReviews.map(r => (
              <ReviewWidgetCard key={r.id} review={r} onClick={()=>setSelectedReview(r)}/>
            ))}
          </div>
        </div>
      ) : (
        /* ── Company widget grid ── */
        filteredCompanies.length === 0 ? (
          <div className="ap-empty" style={{padding:60,textAlign:'center'}}>No businesses with reviews found</div>
        ) : (
          <div className="ap-biz-review-grid">
            {filteredCompanies.map(co => (
              <CompanyReviewWidget key={co.id} company={co} onSelect={setSelectedCompany}/>
            ))}
          </div>
        )
      )}

      {/* ReviewModal for admin — supports reply + delete */}
      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={()=>setSelectedReview(null)}
          mode="admin"
          currentUser={user}
          reactions={{helpful:selectedReview.helpful||0,love:selectedReview.love||0,thanks:selectedReview.thanks||0}}
          onReact={null}
          companyName={selectedReview.companyName}
          onReply={async (reviewId, text) => {
            const rev = reviews.find(r=>r.id===reviewId);
            const newReply = {
              by:'admin', text, userId:user?.uid,
              userName:`Admin: ${user?.displayName||user?.email?.split('@')[0]||'Admin'}`,
              when:new Date().toISOString(), timestamp:Date.now(), isAdminComment:true
            };
            const updatedReplies = [...(rev?.replies||[]), newReply];
            // Immediate modal update
            setSelectedReview(prev=>prev?.id===reviewId?{...prev,replies:updatedReplies}:prev);
            setReviews(prev=>prev.map(r=>r.id===reviewId?{...r,replies:updatedReplies}:r));
            if (selectedCompany) setSelectedCompany(prev=>({...prev,reviews:prev.reviews.map(r=>r.id===reviewId?{...r,replies:updatedReplies}:r)}));
            // Persist to Firestore
            await updateDoc(doc(db,'reviews',reviewId),{replies:updatedReplies});
            await logAudit('admin_comment',`Admin note on review ${reviewId}`);
            showToast('Admin note posted');
          }}
          onDelete={async (reviewId) => {
            await deleteDoc(doc(db,'reviews',reviewId));
            await logAudit('delete_review',`Deleted review ${reviewId}`);
            setReviews(prev=>prev.filter(r=>r.id!==reviewId));
            if (selectedCompany) setSelectedCompany(prev=>({...prev,reviews:prev.reviews.filter(r=>r.id!==reviewId)}));
            showToast('Review deleted');
          }}
        />
      )}

      {/* Delete confirm */}
      {deleteReviewId && (
        <div className="ap-modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteReviewId(null)}>
          <div className="ap-modal ap-modal-sm">
            <div className="ap-modal-header"><h3>Delete Review</h3><button className="ap-modal-close" onClick={()=>setDeleteReviewId(null)}>✕</button></div>
            <div className="ap-danger-box"><div className="ap-danger-icon">⚠️</div><div><strong>Permanently delete this review?</strong><p>This cannot be undone.</p></div></div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-secondary" onClick={()=>setDeleteReviewId(null)}>Cancel</button>
              <button className="ap-btn ap-btn-danger" onClick={doDelete} disabled={saving}>{saving?'Deleting…':'Delete Review'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
