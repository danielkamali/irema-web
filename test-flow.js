import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, getDoc, doc, getDocs, query, collection, where } from 'firebase/firestore';

const stagingConfig = {
  apiKey: "AIzaSyAbKUukYGeS9HOdm1DIawfTvAXOXfeNmn4",
  authDomain: "irema-41070.firebaseapp.com",
  projectId: "irema-41070",
  storageBucket: "irema-41070.firebasestorage.app",
  messagingSenderId: "878994552727",
  appId: "1:878994552727:web:c03617c293ec20cd2f76d2"
};

const app = initializeApp(stagingConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// This is what BusinessesPage.jsx does:
async function businessPortalLogin(email, password) {
  console.log(`\n=== Simulating BusinessesPage login for: ${email} ===\n`);
  
  try {
    // Step 1: Login
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Step 1 - Auth: ✅ Logged in');
    
    // Step 2: Check if admin ( BusinessesPage.jsx line 189-193)
    const adminSnap = await getDoc(doc(db, 'admin_users', cred.user.uid));
    const isAdmin = adminSnap.exists() && adminSnap.data().isActive !== false;
    
    console.log('Step 2 - Check admin_users:', adminSnap.exists() ? 'EXISTS' : 'NOT FOUND');
    if (adminSnap.exists()) {
      console.log('  - isActive:', adminSnap.data().isActive);
    }
    
    if (isAdmin) {
      await signOut(auth);
      console.log('\n❌ BLOCKED: Admin accounts must use the admin portal at /admin/login');
      return;
    }
    console.log('Step 3 - Not admin, check business...');
    
    // Step 3: Check for business ( BusinessesPage.jsx line 195-197)
    const snap = await getDocs(query(collection(db, 'companies'), where('adminUserId', '==', cred.user.uid)));
    if (!snap.empty) {
      console.log('Step 3 - Has business: ✅ Redirect to /company-dashboard');
    } else {
      console.log('Step 3 - No business: ✅ Show error or dashboard');
    }
    
    await signOut(auth);
    console.log('\n✅ Login flow complete');
    
  } catch (e) {
    console.log('❌ Error:', e.code, '-', e.message);
  }
}

businessPortalLogin('amidu@irema.com', '1122334455');