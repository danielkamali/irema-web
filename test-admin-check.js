import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, getDoc, doc } from 'firebase/firestore';

const stagingConfig = {
  apiKey: "AIzaSyAbKUukYGeS9HOdm1DIawfTvAXOXfeNmn4",
  authDomain: "irema-41070.firebaseapp.com",
  projectId: "irema-41070"
};

const app = initializeApp(stagingConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testAdminBlocking() {
  const email = 'amidu@irema.com';
  const password = '1122334455';
  
  console.log(`=== Testing login for: ${email} ===\n`);
  
  try {
    // Step 1: Try to login
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Step 1 - Auth login: ✅ Success');
    console.log('  UID:', cred.user.uid);
    
    // Step 2: Check if they're an admin in Firestore
    const adminSnap = await getDoc(doc(db, 'admin_users', cred.user.uid));
    console.log('\nStep 2 - Check admin_users document:', adminSnap.exists() ? '✅ Exists' : '❌ NOT FOUND');
    
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      console.log('  - isActive:', data.isActive);
      console.log('  - role:', data.role);
      console.log('\n❌ Admin account - should be BLOCKED from user login!');
    } else {
      console.log('\n✅ No admin document - user login should work');
    }
    
    await signOut(auth);
    
  } catch (e) {
    console.log('Step 1 - Auth login: ❌ Failed');
    console.log('  Error:', e.code, '-', e.message);
  }
}

testAdminBlocking();