import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const stagingConfig = {
  apiKey: "AIzaSyAbKUukYGeS9HOdm1DIawfTvAXOXfeNmn4",
  authDomain: "irema-41070.firebaseapp.com",
  projectId: "irema-41070"
};

const app = initializeApp(stagingConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

async function testLogins() {
  console.log('=== Test 1: Email/Password Login ===');
  try {
    const r = await signInWithEmailAndPassword(auth, 'amidu@irema.com', '1122334455');
    console.log('✅ User login works:', r.user.email);
  } catch (e) {
    console.log('❌ User login failed:', e.code);
  }

  console.log('\n=== Test 2: Google Popup Login ===');
  try {
    const r = await signInWithPopup(auth, googleProvider);
    console.log('✅ Google login works:', r.user.email);
  } catch (e) {
    console.log('❌ Google login failed:', e.code, '-', e.message);
  }
}

testLogins();