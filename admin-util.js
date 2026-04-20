/**
 * Admin Management Script
 * 
 * Functions:
 * - delete-admin.js <email> <project>   : Delete both Auth + Firestore
 * - create-admin.js <email> <name> <role> <project> : Create admin (or link to existing Auth)
 * 
 * Projects: staging (irema-41070) or production (irema-production)
 */

import { readFileSync } from 'fs';

const projectArg = process.argv[3] || 'staging';
const serviceAccountPath = projectArg === 'production' 
  ? './service-account-production.json' 
  : './service-account-staging.json';

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (e) {
  console.error(`Service account not found: ${serviceAccountPath}`);
  console.log('\nDownload from: Firebase Console → Project Settings → Service Accounts');
  console.log('Save as: service-account-staging.json OR service-account-production.json');
  process.exit(1);
}

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

const cmd = process.argv[2];
const email = process.argv[3];
const name = process.argv[4];
const role = process.argv[5] || 'Super Admin';

const permissions = {
  users: 'full', businesses: 'full', reviews: 'full', claims: 'full',
  reports: 'full', analytics: 'full', settings: 'full', roles: 'full',
  administrators: 'full', subscriptions: 'full', stories: 'full',
  integrations: 'full', features: 'full', enterprise: 'full',
  translations: 'full', audit: 'full'
};

async function run() {
  if (cmd === 'delete') {
    if (!email) { console.log('Usage: node admin-util.js delete <email>'); process.exit(1); }
    
    console.log(`\n🗑️  Deleting admin: ${email}\n`);
    
    // Delete Auth
    try {
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
      console.log(`✅ Auth user deleted (UID: ${user.uid})`);
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      console.log('⚠️  No Auth user found');
    }
    
    // Delete Firestore
    const { getDocs, query, collection, where } = await import('firebase-admin/firestore');
    const q = query(collection(db, 'admin_users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
      console.log(`✅ Firestore doc deleted (${doc.id})`);
    }
    console.log('\n✅ Done!\n');
  } 
  else if (cmd === 'create') {
    if (!email || !name) { 
      console.log('Usage: node admin-util.js create <email> <name> [role]'); 
      process.exit(1); 
    }
    
    console.log(`\n👤 Creating admin: ${email}\n`);
    
    const password = 'Irema' + Math.random().toString(36).slice(2, 8) + '!';
    
    // Create Auth user
    let uid;
    try {
      const user = await auth.createUser({ email, password, displayName: name });
      uid = user.uid;
      console.log(`✅ Auth user created (UID: ${uid})`);
      console.log(`   Password: ${password}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        console.log(`⚠️  Auth user exists (UID: ${uid})`);
      } else {
        throw e;
      }
    }
    
    // Create Firestore doc
    await db.collection('admin_users').doc(uid).set({
      uid, email, displayName: name, role,
      isActive: true, isPending: false,
      createdAt: new Date(), permissions
    });
    console.log(`✅ Firestore document created`);
    console.log(`\n✅ Admin created! Credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);
  }
  else if (cmd === 'list') {
    console.log('\n📋 Admin Users:\n');
    const snapshot = await db.collection('admin_users').get();
    snapshot.forEach(doc => {
      const d = doc.data();
      console.log(`- ${d.email} (${d.displayName}) - ${d.role} [${d.isActive ? 'active' : 'inactive'}]`);
    });
    console.log(`\nTotal: ${snapshot.size}\n`);
  }
  else {
    console.log(`
Admin Management Utility

Commands:
  node admin-util.js list [staging|production]          - List all admins
  node admin-util.js create <email> <name> [role]      - Create new admin (auto-generates password)
  node admin-util.js delete <email>                     - Delete from both Auth + Firestore

Examples:
  node admin-util.js list staging
  node admin-util.js create john@example.com John Doe "Super Admin"
  node admin-util.js delete john@example.com staging
`);
  }
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });