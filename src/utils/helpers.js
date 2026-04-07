// src/utils/helpers.js

export function getCategoryLabel(value, t) {
  const key = value?.replace(/-/g, '_') || 'other';
  if (t) return t(`categories.${key}`, { defaultValue: value || 'Other' });
  const map = {
    bank: 'Bank', travel: 'Travel Insurance', car_dealer: 'Car Dealer',
    'car-dealer': 'Car Dealer', furniture: 'Furniture Store', jewelry: 'Jewelry Store',
    clothing: 'Clothing Store', electronics: 'Electronics & Technology',
    fitness: 'Fitness & Nutrition', restaurant: 'Restaurant',
    hotel: 'Hotel & Hospitality', healthcare: 'Healthcare', education: 'Education',
    real_estate: 'Real Estate', 'real-estate': 'Real Estate', pharmacy: 'Pharmacy',
    supermarket: 'Supermarket', telecom: 'Telecommunications', other: 'Other',
  };
  return map[key] || value || 'Other';
}

export function formatRelativeTime(timestamp, lang = 'en') {
  if (!timestamp) return '';
  let date;
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp instanceof Date) date = timestamp;
  else return '';

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  const weeks   = Math.floor(diff / (7 * 86400000));
  const months  = Math.floor(diff / (30 * 86400000));
  const years   = Math.floor(diff / (365 * 86400000));

  const t = {
    en: { now:'just now', min:'min ago', h:'h ago', yesterday:'yesterday', days:'days ago', day:'day ago', week:'week ago', weeks:'weeks ago', month:'month ago', months:'months ago', year:'year ago', years:'years ago' },
    fr: { now:"à l'instant", min:'min', h:'h', yesterday:'hier', days:'jours', day:'jour', week:'semaine', weeks:'semaines', month:'mois', months:'mois', year:'an', years:'ans' },
    rw: { now:'nonaha', min:'min', h:'h', yesterday:'ejo', days:'iminsi', day:'umunsi', week:'icyumweru', weeks:'ibyumweru', month:'ukwezi', months:'amezi', year:'umwaka', years:'imyaka' },
    sw: { now:'sasa hivi', min:'dak iliyopita', h:'saa iliyopita', yesterday:'jana', days:'siku zilizopita', day:'siku iliyopita', week:'wiki iliyopita', weeks:'wiki zilizopita', month:'mwezi uliopita', months:'miezi iliyopita', year:'mwaka uliopita', years:'miaka iliyopita' },
  }[lang] || { now:'just now', min:'min ago', h:'h ago', yesterday:'yesterday', days:'days ago', day:'day ago', week:'week ago', weeks:'weeks ago', month:'month ago', months:'months ago', year:'year ago', years:'years ago' };

  if (minutes < 1)   return t.now;
  if (minutes < 60)  return lang === 'en' ? `${minutes} ${t.min}` : `${minutes} ${t.min}`;
  if (hours < 24)    return `${hours}${t.h}`;
  if (days < 7)      return days === 1 ? t.yesterday : `${days} ${t.days}`;
  if (weeks < 5)     return weeks === 1 ? `1 ${t.week}` : `${weeks} ${t.weeks}`;
  if (months < 12)   return months === 1 ? `1 ${t.month}` : `${months} ${t.months}`;
  return years === 1 ? `1 ${t.year}` : `${years} ${t.years}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp?.toDate) date = timestamp.toDate();
  else if (timestamp?.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp instanceof Date) date = timestamp;
  else return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getRatingColor(rating) {
  if (rating >= 4) return '#00b67a';
  if (rating >= 3) return '#73cf11';
  if (rating >= 2) return '#ff8622';
  return '#ff3722';
}

export function getRatingLabel(rating, lang = 'en') {
  const labels = {
    en: { excellent: 'Excellent', great: 'Great', average: 'Average', poor: 'Poor', bad: 'Bad' },
    fr: { excellent: 'Excellent', great: 'Très bien', average: 'Moyenne', poor: 'Mauvais', bad: 'Très mauvais' },
    rw: { excellent: 'Nziza cyane', great: 'Nziza', average: 'Hagati', poor: 'Nbi', bad: 'Nbi cyane' },
    sw: { excellent: 'Bora sana', great: 'Nzuri', average: 'Wastani', poor: 'Mbaya', bad: 'Mbaya sana' },
  };
  const l = labels[lang] || labels.en;
  if (rating >= 4.5) return l.excellent;
  if (rating >= 3.5) return l.great;
  if (rating >= 2.5) return l.average;
  if (rating >= 1.5) return l.poor;
  return l.bad;
}

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}
