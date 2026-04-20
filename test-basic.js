import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const stagingConfig = {
  apiKey: "AIzaSyAbKUukYGeS9HOdm1DIawfTvAXOXfeNmn4",
  authDomain: "irema-41070.firebaseapp.com",
  projectId: "irema-41070"
};

const app = initializeApp(stagingConfig);
const auth = getAuth(app);

async function testLogin() {
  try {
    const result = await signInWithEmailAndPassword(auth, 'amidu@irema.com', '1122334455');
    console.log('✅ Login successful!');
    console.log('UID:', result.user.uid);
    console.log('Email:', result.user.email);
    console.log('Email verified:', result.user.emailVerified);
  } catch (e) {
    console.log('❌ Login failed:', e.code, e.message);
  }
}

testLogin();