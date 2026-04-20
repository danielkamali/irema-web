import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

const testEmails = [
  'amidu@irema.com',
  'daniel.kamali@irema.com',
  'mutangana.bertrand@irema.com'
];

async function testLogins() {
  const passwords = ['1122334455', 'test1234', 'password', 'admin'];
  
  console.log('Testing logins for staging admins:\n');
  
  for (const email of testEmails) {
    for (const pw of passwords) {
      try {
        const result = await signInWithEmailAndPassword(auth, email, pw);
        console.log(`✅ ${email} - works with password: "${pw}"`);
        break;
      } catch (e) {
        process.stdout.write('.');
      }
    }
  }
  console.log('\nDone');
}

testLogins();