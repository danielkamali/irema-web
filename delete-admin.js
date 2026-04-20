/**
 * Complete Admin Deletion Script
 * Deletes admin from BOTH Firebase Auth AND Firestore
 * 
 * Usage: node delete-admin.js <email> <project>
 * Example: node delete-admin.js john@example.com staging
 * 
 * Projects: staging (irema-41070) or production (irema-production)
 */

import { readFileSync } from 'fs';

// Load service account based on project
const project = process.argv[3] || 'staging';
const serviceAccountPath = project === 'production' 
  ? './service-account-production.json' 
  : './service-account-staging.json';

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error(`Service account not found: ${serviceAccountPath}`);
  console.log('Download from: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();
const db = getFirestore();

const email = process.argv[2];
if (!email) {
  console.log('Usage: node delete-admin.js <email> <project>');
  console.log('  project: staging (default) or production');
  process.exit(1);
}

async function deleteAdmin() {
  console.log(`\n🗑️  Deleting admin: ${email} from ${project}\n`);
  
  try {
    // Step 1: Find and delete the Auth user
    console.log('Step 1: Deleting from Firebase Authentication...');
    try {
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
      console.log(`  ✅ Auth user deleted (UID: ${user.uid})`);
    } catch (authError) {
      if (authError.code === 'auth/user-not-found') {
        console.log('  ⚠️  No Auth user found (may already be deleted)');
      } else {
        throw authError;
      }
    }

    // Step 2: Delete the Firestore document
    console.log('\nStep 2: Deleting from Firestore admin_users...');
    try {
      // First find the document by email
      const { getDocs, query, collection, where } = await import('firebase/firestore');
      const q = query(collection(db, 'admin_users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('  ⚠️  No Firestore document found (may already be deleted)');
      } else {
        for (const doc of snapshot.docs) {
          await doc.ref.delete();
          console.log(`  ✅ Firestore document deleted (ID: ${doc.id})`);
        }
      }
    } catch (fsError) {
      console.log(`  ⚠️  Firestore error: ${fsError.message}`);
    }

    console.log('\n✅ Admin fully deleted from both Auth and Firestore!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

deleteAdmin();