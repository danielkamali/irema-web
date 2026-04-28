import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { db, collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, serverTimestamp } from '../firebase/config';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PaymentsPage.css';

const PLANS = [
  { id:'starter', name:'Starter', price:0, currency:'RWF', period:'month',
    features:['1 business listing','Unlimited reviews from customers','Respond to up to 50 reviews','Basic analytics','Email notifications','Community badge'],
    cta:'Get Started Free', highlight:false },
  { id:'professional', name:'Professional', price:25000, currency:'RWF', period:'month',
    features:['1 business listing','Unlimited reviews','Unlimited responses to reviews','Advanced analytics + charts','Priority support','Verified badge','QR code downloads','Competitor insights'],
    cta:'Start 14-day Trial', highlight:true },
  { id:'enterprise', name:'Enterprise', price:75000, currency:'RWF', period:'month',
    features:['Up to 5 listings','Unlimited everything','Unlimited responses','AI sentiment analysis','Dedicated account manager','Custom integrations','White-label widgets','API access','SLA support','Product listings on your page'],
    cta:'Get Enterprise', highlight:false },
];

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/businesses');
      return;
    }
    loadCompanyAndSubscription();
  }, [user, navigate]);

  async function loadCompanyAndSubscription() {
    try {
      const bizSnap = await getDocs(query(collection(db,'companies'), where('adminUserId','==',user.uid)));
      if (bizSnap.empty) {
        navigate('/company-dashboard');
        return;
      }
      const bizDoc = bizSnap.docs[0];
      setCompany({ id: bizDoc.id, ...bizDoc.data() });

      const subSnap = await getDocs(query(collection(db,'subscriptions'), where('companyId','==',bizDoc.id)));
      if (!subSnap.empty) {
        setSubscription(subSnap.docs[0].data());
      }
    } catch (e) {
      console.error('Failed to load company/subscription:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectPlan(plan) {
    if (!company) return;
    if (plan.id === 'starter') {
      // Starter is free
      navigate('/company-dashboard');
      return;
    }

    setSelectedPlan(plan.id);
    try {
      const subData = {
        companyId: company.id,
        plan: plan.id,
        status: plan.id === 'professional' ? 'trial' : 'pending',
        trialStarted: plan.id === 'professional' ? new Date().toISOString() : null,
        amount: plan.price,
        billingCycle: 'monthly',
        createdAt: serverTimestamp(),
      };

      const ref = await addDoc(collection(db,'subscriptions'), subData);
      if (ref) {
        // Update company with new subscription
        await updateDoc(doc(db,'companies',company.id), { subscriptionId: ref.id, plan: plan.id });
        navigate('/company-dashboard?tab=subscription');
      }
    } catch (e) {
      console.error('Failed to create subscription:', e);
    } finally {
      setSelectedPlan(null);
    }
  }

  if (loading) {
    return (
      <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div>Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div data-theme={theme} style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />
      <div className="container" style={{ maxWidth: 1100, padding: '60px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Billing & Plans</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 16 }}>Choose Your Plan</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto' }}>
            Scale your business with Irema. All plans include unlimited customer reviews and basic analytics.
          </p>
        </div>

        {subscription && (
          <div style={{ background: 'var(--surface)', border: '2px solid var(--brand)', borderRadius: 12, padding: 20, marginBottom: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>
              Current Plan: <strong style={{ color: 'var(--brand)', textTransform: 'capitalize' }}>{subscription.plan}</strong>
            </p>
            {subscription.status === 'trial' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Trial active. Upgrade anytime to continue after 14 days.</p>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 60 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: 'var(--surface)',
              border: plan.highlight ? '2px solid var(--brand)' : '1px solid var(--border)',
              borderRadius: 16,
              padding: 32,
              position: 'relative',
              transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}>
              {plan.highlight && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--brand)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  Popular
                </div>
              )}

              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>{plan.name}</h3>

              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand)' }}>
                  {plan.price === 0 ? 'Free' : `${plan.price.toLocaleString()}`}
                </div>
                {plan.price > 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 4 }}>RWF per {plan.period}</div>
                )}
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                disabled={selectedPlan === plan.id}
                style={{
                  width: '100%',
                  background: plan.highlight ? 'var(--brand)' : 'var(--bg)',
                  color: plan.highlight ? 'white' : 'var(--text-1)',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                  padding: '12px 24px',
                  borderRadius: 10,
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: selectedPlan === plan.id ? 'not-allowed' : 'pointer',
                  opacity: selectedPlan === plan.id ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  marginBottom: 24
                }}>
                {selectedPlan === plan.id ? 'Processing...' : plan.cta}
              </button>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--brand)', fontWeight: 700 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>Have questions?</h3>
          <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>Our support team is here to help you choose the right plan for your business.</p>
          <a href="mailto:daniel.kamali@irema.rw" style={{
            display: 'inline-block',
            background: 'var(--brand)',
            color: 'white',
            padding: '12px 32px',
            borderRadius: 10,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            Contact Support
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
