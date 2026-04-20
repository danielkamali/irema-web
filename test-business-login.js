import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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

async function testUserAndBusinessLogin() {
  console.log('=== Test 1: User Login (regular user) ===');
  try {
    const r = await signInWithEmailAndPassword(auth, 'amidu@irema.com', '1122334455');
    console.log('✅ User logged in:', r.user.email);
    await signOut(auth);
    console.log('Logged out\n');
  } catch (e) {
    console.log('❌ User login failed:', e.code, '-', e.message, '\n');
  }

  console.log('=== Test 2: Business Login ===');
  // Try to find a business account
  try {
    const email = 'amidu@irema.com';
    const r = await signInWithEmailAndPassword(auth, email, '1122334455');
    console.log('✅ Business user logged in:', r.user.email);
    
    // Check if they have a business
    const companiesSnap = await getDocs(query(collection(db, 'companies'), where('adminUserId', '==', r.user.uid)));
    if (!companiesSnap.empty) {
      console.log('✅ Has business:', companiesSnap.docs[0].data().name);
    } else {
      console.log('⚠️ No business found for this user');
    }
    await signOut(auth);
    console.log('Logged out\n');
  } catch (e) {
    console.log('❌ Business login failed:', e.code, '-', e.message, '\n');
  }
}

testUserAndBusinessLogin();