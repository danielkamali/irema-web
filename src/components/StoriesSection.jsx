import React, { useState, useRef, useEffect } from 'react';
import { db, storage, collection, query, where, getDocs, addDoc, serverTimestamp, limit, storageRef, uploadBytes, getDownloadURL } from '../firebase/config';
import './StoriesSection.css';

/* ── Single story card ── */
function StoryCard({ story, isActive, onClick, onHoverPlay, onHoverStop }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);

  // NO autoplay on intersection — only play on explicit hover or active click

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) {
      v.currentTime = 0;
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false); setProgress(0);
    }
  }, [isActive]);

  const isVideo = story.mediaType === 'video' ||
    /\.(mp4|webm|mov|ogg)(\?|$)/i.test(story.mediaUrl || '');

  function handleMouseEnter() {
    onHoverPlay && onHoverPlay(); // pause auto-scroll
    if (!isActive && isVideo && videoRef.current) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function handleMouseLeave() {
    onHoverStop && onHoverStop(); // resume auto-scroll
    if (!isActive && isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false); setProgress(0);
    }
  }

  return (
    <div
      ref={cardRef}
      className={`story-card${isActive ? ' story-card-active' : ''}`}
      onClick={() => !isActive && onClick(story.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && !isActive && onClick(story.id)}
    >
      {isActive && (
        <div className="story-progress-bar">
          <div className="story-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="story-media-wrap">
        {isVideo ? (
          <video
            ref={videoRef}
            src={story.mediaUrl}
            className="story-video"
            muted={muted} playsInline preload="metadata"
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onEnded={() => { setPlaying(false); setProgress(0); }}
            onClick={isActive ? e => {
              e.stopPropagation();
              if (playing) { 
                videoRef.current?.pause();
                // Reset to start so card doesn't show a frozen mid-frame
                if (videoRef.current) videoRef.current.currentTime = 0;
                setPlaying(false); setProgress(0);
              }
              else { videoRef.current?.play().then(() => setPlaying(true)).catch(() => {}); }
            } : undefined}
          />
        ) : story.mediaUrl || story.thumbnailUrl ? (
          <img src={story.mediaUrl || story.thumbnailUrl} alt={story.jobTitle} className="story-video" style={{ objectFit:'cover' }} />
        ) : (
          // Text-only story: show gradient background with large quote
          <div style={{width:'100%',height:'100%',background:'linear-gradient(160deg,#1a5c3e 0%,#0f3d2e 60%,#061a12 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',boxSizing:'border-box'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'2.5rem',marginBottom:12,opacity:0.4}}>&ldquo;</div>
              <p style={{color:'rgba(255,255,255,0.9)',fontSize:'0.95rem',lineHeight:1.6,fontStyle:'italic'}}>{story.caption || story.jobTitle}</p>
            </div>
          </div>
        )}

        {(isVideo || story.mediaUrl || story.thumbnailUrl) && <div className="story-overlay" />}

        {story.jobTitle && <div className="story-badge story-badge-job">{story.jobTitle}</div>}
        {story.rating && (
          <div className="story-badge story-badge-rating">
            {'★'.repeat(Math.round(story.rating || 5))}{'☆'.repeat(5-Math.round(story.rating||5))}
          </div>
        )}
        {story.country && <div className="story-badge story-badge-country">{story.countryFlag || '🌍'} {story.country}</div>}
        {story.tag && <div className="story-badge story-badge-tag">{story.tag}</div>}

        <div className="story-caption">
          {story.companyName && story.companyName !== 'Demo' && (
            <div className="story-caption-company-name">🏢 {story.companyName}</div>
          )}
          {story.caption && <p className="story-caption-text">"{story.caption}"</p>}
        </div>

        {isActive && isVideo && (
          <div className="story-controls">
            <button className="story-ctrl-btn" onClick={e => {
              e.stopPropagation();
              if (playing) { 
                videoRef.current?.pause();
                // Reset to start so card doesn't show a frozen mid-frame
                if (videoRef.current) videoRef.current.currentTime = 0;
                setPlaying(false); setProgress(0);
              }
              else { videoRef.current?.play().then(() => setPlaying(true)).catch(() => {}); }
            }}>
              {playing
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              }
            </button>
            <button className="story-ctrl-btn" onClick={e => {
              e.stopPropagation();
              if (videoRef.current) { videoRef.current.muted = !videoRef.current.muted; setMuted(videoRef.current.muted); }
            }}>
              {muted
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              }
            </button>
          </div>
        )}

        {!isActive && isVideo && (
          <div className="story-play-hint">
            <div className="story-play-circle">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main StoriesSection ── */
export default function StoriesSection({ companyId, companyName, showUpload = false, currentUser, limit: maxStories = 10 }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    jobTitle: '', caption: '', country: 'Rwanda', rating: 5,
    countryFlag: '🇷🇼', tag: 'Customer Experience', mediaUrl: '',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const autoScrollRef = useRef(null);
  const isPausedRef = useRef(false);

  // Auto-scroll: seamless infinite loop — duplicate cards, silently reset at midpoint
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || stories.length === 0) return;
    // Wait a frame so DOM has rendered the duplicated cards
    let animId;
    const startScroll = () => {
      function tick() {
        if (!isPausedRef.current && el) {
          el.scrollLeft += 0.8;
          // Seamless loop: when we've scrolled past the first copy, silently jump back
          const half = el.scrollWidth / 2;
          if (el.scrollLeft >= half) {
            el.scrollLeft -= half;
          }
        }
        animId = requestAnimationFrame(tick);
      }
      animId = requestAnimationFrame(tick);
    };
    // Short delay so duplicated DOM is measured
    const t = setTimeout(startScroll, 100);
    const pause = () => { isPausedRef.current = true; };
    const resume = () => { isPausedRef.current = false; };
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('touchend', resume);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(animId);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('touchend', resume);
    };
  }, [stories]);

  useEffect(() => { loadStories(); }, [companyId]);

  async function loadStories() {
    setLoading(true);
    try {
      const q = companyId
        ? query(collection(db, 'company_stories'), where('companyId', '==', companyId), where('status', '==', 'published'), limit(maxStories))
        : query(collection(db, 'company_stories'), where('status', '==', 'published'), limit(maxStories));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by viewCount descending (most-viewed first)
      data.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      setStories(data);
    } catch { setStories([]); }
    setLoading(false);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile && !uploadForm.mediaUrl.trim()) { setUploadError('Please select a video file or enter a URL'); return; }
    setUploading(true); setUploadError('');
    try {
      let mediaUrl = uploadForm.mediaUrl;
      if (uploadFile) {
        setUploadProgress('Uploading video…');
        const ext = uploadFile.name.split('.').pop() || 'mp4';
        const path = `company-stories/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const ref = storageRef(storage, path);
        const snap = await uploadBytes(ref, uploadFile, { contentType: uploadFile.type || 'video/mp4' });
        mediaUrl = await getDownloadURL(snap.ref);
        setUploadProgress('Saving story…');
      }
      await addDoc(collection(db, 'company_stories'), {
        ...uploadForm, mediaUrl,
        companyId: companyId || null,
        companyName: companyName || 'Irema',
        mediaType: 'video', status: 'published',
        addedBy: currentUser?.uid || 'admin',
        createdAt: serverTimestamp(),
      });
      setShowUploadForm(false);
      setUploadFile(null);
      setUploadProgress('');
      setUploadForm({ jobTitle:'', caption:'', country:'Rwanda', rating:5, countryFlag:'🇷🇼', tag:'Customer Experience', mediaUrl:'' });
      await loadStories();
    } catch (e) { setUploadError(e.message); }
    setUploading(false);
    setUploadProgress('');
  }

  if (loading) return (
    <div className="stories-section">
      <div className="stories-loading">{[1,2,3,4,5].map(i => <div key={i} className="story-skeleton" />)}</div>
    </div>
  );

  return (
    <section className="stories-section">
      <div className="stories-header">
        <div>
          <div className="stories-eyebrow"><span className="stories-eyebrow-dot" />Real Stories</div>
          <h2 className="stories-title">Company Review Stories</h2>
          <p className="stories-sub">Hear from real people about their experiences — salaries, culture, and more</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {showUpload && currentUser && (
            <button className="stories-upload-btn" onClick={() => setShowUploadForm(v => !v)}>
              + Add Story
            </button>
          )}

        </div>
      </div>

      {showUploadForm && (
        <div className="story-upload-form" style={{ maxWidth:1240, margin:'0 auto 24px', padding:'20px 24px' }}>
          <h4>📹 Add Business Story (Admin Only)</h4>
          {uploadError && <div className="story-upload-error">{uploadError}</div>}
          {uploadProgress && <div style={{ color:'var(--brand)', fontSize:'0.85rem', marginBottom:10 }}>⏳ {uploadProgress}</div>}
          <form onSubmit={handleUpload}>
            <div className="story-upload-grid">
              <input className="story-upload-input" placeholder="Story Title (e.g. Customer Experience) *" required value={uploadForm.jobTitle} onChange={e => setUploadForm(p=>({...p,jobTitle:e.target.value}))} />
              <select className="story-upload-input" value={uploadForm.rating||5} onChange={e => setUploadForm(p=>({...p,rating:parseInt(e.target.value)}))}>
                <option value={5}>★★★★★ Excellent (5)</option>
                <option value={4}>★★★★☆ Great (4)</option>
                <option value={3}>★★★☆☆ Good (3)</option>
                <option value={2}>★★☆☆☆ Fair (2)</option>
                <option value={1}>★☆☆☆☆ Poor (1)</option>
              </select>
              <input className="story-upload-input" placeholder="Category (e.g. Customer Service, Food, Quality)" value={uploadForm.tag} onChange={e => setUploadForm(p=>({...p,tag:e.target.value}))} />
              <input className="story-upload-input" placeholder="Location in Rwanda (optional)" value={uploadForm.country} onChange={e => setUploadForm(p=>({...p,country:e.target.value}))} />
              <input className="story-upload-input" style={{gridColumn:'1/-1'}} placeholder='Customer quote (e.g. "The service was exceptional!")' value={uploadForm.caption} onChange={e => setUploadForm(p=>({...p,caption:e.target.value}))} />
              {/* File upload */}
              <div className="story-file-drop" style={{gridColumn:'1/-1'}} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="video/*" onChange={e => setUploadFile(e.target.files[0])} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" style={{marginBottom:8}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <div style={{fontSize:'0.85rem',color:'var(--text-2)',fontWeight:600}}>
                  {uploadFile ? `✓ ${uploadFile.name}` : 'Click to upload video file'}
                </div>
                <div style={{fontSize:'0.75rem',color:'var(--text-4)',marginTop:4}}>MP4, WebM, MOV — max 200MB</div>
              </div>
              <div style={{gridColumn:'1/-1',textAlign:'center',fontSize:'0.8rem',color:'var(--text-4)'}}>— or paste a video URL —</div>
              <input className="story-upload-input" style={{gridColumn:'1/-1'}} placeholder="Video URL (optional if file uploaded above)" value={uploadForm.mediaUrl} onChange={e => setUploadForm(p=>({...p,mediaUrl:e.target.value}))} />
            </div>
            <div style={{display:'flex',gap:8,marginTop:14}}>
              <button type="submit" className="stories-upload-btn" disabled={uploading}>
                {uploading ? uploadProgress || 'Uploading…' : '🚀 Publish Story'}
              </button>
              <button type="button" style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'0.85rem',fontWeight:600}} onClick={() => setShowUploadForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {stories.length > 0 && (
      <div className="stories-scroll-wrap">
        <div className="stories-strip" ref={scrollRef}>
          {[...stories, ...stories].map((story, i) => (
            <StoryCard
              key={`${story.id}-${i}`}
              story={story}
              isActive={activeId === story.id && i < stories.length}
              onClick={id => {
                if (i < stories.length) {
                  isPausedRef.current = true;
                  setActiveId(prev => prev === id ? null : id);
                }
              }}
              onHoverPlay={() => { isPausedRef.current = true; }}
              onHoverStop={() => {
                // Only resume scroll if no card is actively playing
                if (!activeId) isPausedRef.current = false;
              }}
            />
          ))}
        </div>
      </div>
      )}
    </section>
  );
}
