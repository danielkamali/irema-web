import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { storageRef, uploadBytes, getDownloadURL } from '../../firebase/config';
import { useAuthStore } from '../../store/authStore';
import AdminLayout from './AdminLayout';
import './AdminPages.css';

export default function AdminStories() {
  const { user } = useAuthStore();
  const [stories, setStories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    jobTitle: '', caption: '', country: 'Rwanda', countryFlag: '🇷🇼',
    tag: 'Customer Experience', mediaUrl: '', companyId: '', rating: 5
  });
  const [file, setFile] = useState(null);
  const [filterCompany, setFilterCompany] = useState('');
  const fileRef = React.useRef(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [sSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db,'company_stories'))).catch(()=>({docs:[]})),
        getDocs(collection(db,'companies')).catch(()=>({docs:[]})),
      ]);
      const bizMap = {};
      cSnap.docs.forEach(d => { bizMap[d.id] = d.data().companyName || d.data().name || 'Unknown'; });
      const data = sSnap.docs.map(d => ({ id:d.id, ...d.data(), bizName: bizMap[d.data().companyId] || 'General' }));
      data.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      setStories(data);
      setCompanies(cSnap.docs.map(d => ({ id:d.id, name:d.data().companyName||d.data().name||'—' })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file && !form.mediaUrl.trim()) { showToast('Upload a video or enter a URL','error'); return; }
    setUploading(true);
    try {
      let mediaUrl = form.mediaUrl;
      if (file) {
        setUploadProgress('Uploading video…');
        const ext = file.name.split('.').pop() || 'mp4';
        const path = `company-stories/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const ref = storageRef(storage, path);
        const snap = await uploadBytes(ref, file, { contentType: file.type || 'video/mp4' });
        mediaUrl = await getDownloadURL(snap.ref);
      }
      const selectedBiz = companies.find(c => c.id === form.companyId);
      await addDoc(collection(db,'company_stories'), {
        ...form, mediaUrl,
        companyName: selectedBiz?.name || 'Irema',
        mediaType: 'video', status: 'published',
        addedBy: user?.uid || 'admin',
        createdAt: serverTimestamp(),
      });
      showToast('Story published!');
      setShowAdd(false); setFile(null);
      setForm({ jobTitle:'', caption:'', country:'Rwanda', countryFlag:'🇷🇼', tag:'Customer Experience', mediaUrl:'', companyId:'', rating:5 });
      await loadAll();
    } catch(e) { showToast(e.message,'error'); }
    setUploading(false); setUploadProgress('');
  }

  async function toggleStatus(story) {
    const newStatus = story.status === 'published' ? 'hidden' : 'published';
    await updateDoc(doc(db,'company_stories',story.id), { status: newStatus });
    setStories(prev => prev.map(s => s.id===story.id ? {...s,status:newStatus} : s));
    showToast(`Story ${newStatus}`);
  }

  async function deleteStory(id) {
    if (!window.confirm('Delete this story?')) return;
    await deleteDoc(doc(db,'company_stories',id));
    setStories(prev => prev.filter(s => s.id!==id));
    showToast('Story deleted');
  }

  const filtered = filterCompany ? stories.filter(s => s.companyId === filterCompany) : stories;

  return (
    <AdminLayout>
      {toast && <div className={`ap-toast ap-toast-${toast.type}`}>{toast.type==='success'?'✓':'✗'} {toast.msg}</div>}

      <div className="ap-page-header">
        <h1 className="ap-page-title">📹 Company Stories</h1>
        <div className="ap-header-actions">
          <select className="ap-filter-select" value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="ap-btn ap-btn-primary" onClick={()=>setShowAdd(v=>!v)}>
            + Add Story
          </button>
        </div>
      </div>

      {/* Add story form */}
      {showAdd && (
        <div className="ap-card" style={{padding:24,marginBottom:24,borderRadius:14,border:'1px solid var(--border)'}}>
          <h3 style={{margin:'0 0 16px',fontSize:'0.95rem',fontWeight:700}}>New Company Story</h3>
          {uploadProgress && <div style={{color:'var(--brand)',fontSize:'0.84rem',marginBottom:10}}>⏳ {uploadProgress}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div className="ap-field">
                <label>Company *</label>
                <select className="ap-input" value={form.companyId} onChange={e=>setForm(p=>({...p,companyId:e.target.value}))} required>
                  <option value="">Select company</option>
                  {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="ap-field">
                <label>Story Title *</label>
                <input className="ap-input" value={form.jobTitle} onChange={e=>setForm(p=>({...p,jobTitle:e.target.value}))} placeholder="e.g. Great Customer Service" required/>
              </div>
              <div className="ap-field">
                <label>Category Tag</label>
                <input className="ap-input" value={form.tag} onChange={e=>setForm(p=>({...p,tag:e.target.value}))} placeholder="e.g. Customer Experience"/>
              </div>
              <div className="ap-field">
                <label>Star Rating</label>
                <select className="ap-input" value={form.rating} onChange={e=>setForm(p=>({...p,rating:parseInt(e.target.value)}))}>
                  {[5,4,3,2,1].map(n=><option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
                </select>
              </div>
              <div className="ap-field" style={{gridColumn:'1/-1'}}>
                <label>Customer Quote</label>
                <input className="ap-input" value={form.caption} onChange={e=>setForm(p=>({...p,caption:e.target.value}))} placeholder="e.g. Best service in Kigali!"/>
              </div>
              <div className="ap-field" style={{gridColumn:'1/-1'}}>
                <label>Upload Video</label>
                <div style={{border:'2px dashed var(--border)',borderRadius:10,padding:20,textAlign:'center',cursor:'pointer',transition:'border-color 0.15s'}}
                  onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('video/'))setFile(f);}}>
                  <input ref={fileRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
                  <div style={{fontSize:'0.88rem',color:'var(--text-2)',fontWeight:600}}>{file?`✓ ${file.name}`:'Click or drag video here (MP4, WebM, MOV)'}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-4)',marginTop:4}}>Max 200MB</div>
                </div>
              </div>
              <div className="ap-field" style={{gridColumn:'1/-1'}}>
                <label>— or paste video URL —</label>
                <input className="ap-input" value={form.mediaUrl} onChange={e=>setForm(p=>({...p,mediaUrl:e.target.value}))} placeholder="https://... (optional if file uploaded)"/>
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button type="submit" className="ap-btn ap-btn-primary" disabled={uploading}>{uploading?'Publishing…':'🚀 Publish Story'}</button>
              <button type="button" className="ap-btn ap-btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stories grid */}
      {loading ? (
        <div style={{padding:60,textAlign:'center'}}><div className="ap-spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="ap-empty" style={{padding:60,textAlign:'center'}}>
          No stories yet. Click "Add Story" to publish the first one.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:16}}>
          {filtered.map(story => (
            <div key={story.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
              {/* Preview */}
              <div style={{height:160,background:'#111',position:'relative',overflow:'hidden'}}>
                {story.mediaType==='video' && story.mediaUrl ? (
                  <video src={story.mediaUrl} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline preload="none"/>
                ) : (
                  <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,#1a4535,#2d8f6f)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem'}}>🎬</div>
                )}
                <div style={{position:'absolute',top:8,right:8}}>
                  <span style={{background:story.status==='published'?'#10b981':'#6b7280',color:'white',fontSize:'0.65rem',fontWeight:700,padding:'3px 8px',borderRadius:99}}>
                    {story.status||'published'}
                  </span>
                </div>
              </div>
              {/* Info */}
              <div style={{padding:'12px 14px'}}>
                <div style={{fontWeight:700,fontSize:'0.85rem',color:'var(--text-1)',marginBottom:2}}>{story.jobTitle||'—'}</div>
                <div style={{fontSize:'0.75rem',color:'var(--brand)',fontWeight:600,marginBottom:4}}>🏢 {story.bizName}</div>
                {story.caption && <p style={{fontSize:'0.75rem',color:'var(--text-3)',fontStyle:'italic',margin:'0 0 8px'}}>"{story.caption.slice(0,60)}{story.caption.length>60?'…':''}"</p>}
                <div style={{fontSize:'0.7rem',color:'var(--text-4)',marginBottom:10}}>
                  {story.createdAt?.seconds ? new Date(story.createdAt.seconds*1000).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}) : '—'}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button className="ap-btn ap-btn-ghost ap-btn-sm" style={{flex:1,fontSize:'0.72rem'}} onClick={()=>toggleStatus(story)}>
                    {story.status==='published'?'Hide':'Show'}
                  </button>
                  <button className="ap-btn ap-btn-danger ap-btn-sm" style={{fontSize:'0.72rem'}} onClick={()=>deleteStory(story.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
