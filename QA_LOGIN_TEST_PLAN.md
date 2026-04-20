# QA Login Test Plan - Irema

## Issue Summary
1. ❌ Staging app showing production data
2. ❌ Domain not authorized for OAuth (auth/unauthorized-domain)
3. ❌ Google popup fails, no fallback to redirect

---

## Root Cause Analysis

### Issue #1: Staging Showing Production Data
**Possible Causes:**
- [ ] `.env` file has production Firebase config instead of staging
- [ ] Build used wrong mode (should be `vite build` not `vite build --mode production`)
- [ ] Firestore security rules allowing cross-project access
- [ ] Browser cache has old production data

**Fix:**
```bash
# Verify .env has staging config
cat .env | grep FIREBASE_PROJECT_ID
# Should show: VITE_FIREBASE_PROJECT_ID=irema-41070

# Always build without mode (defaults to dev/staging)
npm run build
# DO NOT use: vite build --mode production
```

### Issue #2: Domain Not Authorized for OAuth
**Current Issue:** Firebase console not recognizing `irema-41070.web.app`

**Required Domains in Firebase Console > Authentication > Settings > Authorized domains:**
- `irema-41070.firebaseapp.com` ✅
- `irema-41070.web.app` ❌ **MISSING** - Need to add
- `localhost:5173` ✅

### Issue #3: Popup OAuth Fails
**Root Cause:** Firebase config being sent to Google includes unauthorized domain

**Error:** `auth/unauthorized-domain` means:
- Domain not in Firebase console authorized list
- Popup tries to auth against irema-41070 project
- Firebase rejects because `irema-41070.web.app` not authorized

---

## QA Test Steps

### STEP 1: Verify Firebase Configuration
```bash
# Check which project is active
firebase projects:list

# Current project should be: irema-41070 (staging)
```

### STEP 2: Add Missing Authorized Domain
1. Go to Firebase Console: https://console.firebase.google.com/project/irema-41070
2. Click **Authentication** → **Settings** tab
3. Scroll to **Authorized domains**
4. Click **Add domain**
5. Enter: `irema-41070.web.app`
6. Click **Add**
7. Verify list now includes:
   - `localhost`
   - `irema-41070.firebaseapp.com`
   - `irema-41070.web.app` ✅ NEW
   - `127.0.0.1`

### STEP 3: Verify Environment Configuration
```bash
# Confirm .env has staging config
grep "FIREBASE_PROJECT_ID" .env
# Expected output: VITE_FIREBASE_PROJECT_ID=irema-41070

# Confirm vite.config uses correct defaults
cat vite.config.js
```

### STEP 4: Clear Build & Browser Cache
```bash
# Delete old build
rm -rf dist/

# Rebuild fresh
npm run build

# Clear browser cache
# Chrome: DevTools > Settings > Clear site data on exit
# Or: Cmd+Shift+Delete > All time > Cache
```

### STEP 5: Test User Login
1. Go to `https://irema-41070.web.app`
2. Click **Sign Up**
3. Test **Email/Password**:
   - Email: `test.user@example.com`
   - Password: `Test123!`
   - Expected: Account created, modal closes
4. Click **Sign In**
5. Test **Google Popup**:
   - Click "Continue with Google"
   - Expected: Popup window opens (NOT full-page redirect)
   - Select account
   - Expected: Popup closes, user logged in ✅

### STEP 6: Test Business Login
1. Go to `/businesses` (or click Business Portal)
2. Test **Email/Password**:
   - Email: `business@example.com`
   - Password: `Business123!`
   - Expected: Redirects to company-dashboard OR registration form
3. Test **Google Popup**:
   - Click "Continue with Google"
   - Expected: Popup window opens
   - Select account
   - Expected: Redirects to company-dashboard OR registration form ✅

### STEP 7: Test Admin Login
1. Go to `/admin/login`
2. Test **Email/Password**:
   - Email: `admin@irema.rw`
   - Password: `AdminPassword123!`
   - Expected: Redirects to /admin dashboard
3. No Google login (admin only uses email/password) ✅

### STEP 8: Verify Data Isolation
```javascript
// Open browser console and check:
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)
// Should show: irema-41070

// Check Firestore connection
db.collection('companies').get().then(snap => {
  console.log('Companies:', snap.docs.map(d => d.data().companyName))
})
```

---

## Expected Results

| Test | Expected | Pass |
|------|----------|------|
| .env has staging config | `irema-41070` | ⬜ |
| Build uses staging config | No production data | ⬜ |
| Authorized domains include `irema-41070.web.app` | Added ✅ | ⬜ |
| User email/password login | Works ✅ | ⬜ |
| User Google popup | Opens in new window ✅ | ⬜ |
| User Google fallback | Redirects if popup fails ✅ | ⬜ |
| Business email/password login | Works ✅ | ⬜ |
| Business Google popup | Opens in new window ✅ | ⬜ |
| Admin email/password login | Works ✅ | ⬜ |
| No cross-project data leak | Staging data only ✅ | ⬜ |

---

## Quick Fix Summary

```bash
# 1. Ensure .env has staging config
cat .env | head -6

# 2. Clean build
rm -rf dist/
npm run build

# 3. Deploy to staging
firebase deploy --only hosting --project irema-41070

# 4. Add irema-41070.web.app to Firebase console authorized domains

# 5. Test at: https://irema-41070.web.app
```
