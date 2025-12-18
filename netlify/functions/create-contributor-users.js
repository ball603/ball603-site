/**
 * Ball603 Contributor User Creation Script
 * 
 * Creates Supabase Auth users for all active contributors.
 * Does NOT send password recovery emails - you do that manually in Supabase dashboard.
 * 
 * Usage:
 *   node create-contributor-users.js
 * 
 * Required environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your service_role key (not anon key)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
  console.log('\nRun with:');
  console.log('  SUPABASE_SERVICE_KEY=your_key_here node create-contributor-users.js');
  process.exit(1);
}

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}${endpoint}`;
  
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${text}`);
  }
  
  return text ? JSON.parse(text) : null;
}

async function getActiveContributors() {
  const data = await supabaseRequest('/rest/v1/contributors?select=id,name,email,active&active=eq.true');
  return data;
}

async function getExistingAuthUsers() {
  // Use the Auth Admin API to list users
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get auth users: ${text}`);
  }
  
  const data = await response.json();
  return data.users || [];
}

async function createAuthUser(email) {
  // Create user with a random password (they'll reset it)
  const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + '!A1';
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: randomPassword,
      email_confirm: true, // Auto-confirm the email
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.msg || data.message || JSON.stringify(data));
  }
  
  return data;
}

async function main() {
  console.log('🏀 Ball603 Contributor User Creation\n');
  
  // Step 1: Get all active contributors
  console.log('📋 Fetching active contributors...');
  const contributors = await getActiveContributors();
  console.log(`   Found ${contributors.length} active contributors\n`);
  
  // Step 2: Get existing auth users
  console.log('👥 Fetching existing Auth users...');
  const existingUsers = await getExistingAuthUsers();
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
  console.log(`   Found ${existingUsers.length} existing Auth users\n`);
  
  // Step 3: Find contributors who need Auth users
  const needsUser = contributors.filter(c => !existingEmails.has(c.email.toLowerCase()));
  const alreadyHasUser = contributors.filter(c => existingEmails.has(c.email.toLowerCase()));
  
  console.log(`✅ Already have Auth users: ${alreadyHasUser.length}`);
  alreadyHasUser.forEach(c => console.log(`   - ${c.name} (${c.email})`));
  
  console.log(`\n🆕 Need Auth users: ${needsUser.length}`);
  needsUser.forEach(c => console.log(`   - ${c.name} (${c.email})`));
  
  if (needsUser.length === 0) {
    console.log('\n✨ All contributors already have Auth users!');
    return;
  }
  
  // Step 4: Create Auth users
  console.log('\n📝 Creating Auth users...\n');
  
  let created = 0;
  let failed = 0;
  
  for (const contributor of needsUser) {
    try {
      await createAuthUser(contributor.email);
      console.log(`   ✅ Created: ${contributor.name} (${contributor.email})`);
      created++;
    } catch (err) {
      console.log(`   ❌ Failed: ${contributor.name} (${contributor.email}) - ${err.message}`);
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`   Created: ${created}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Already existed: ${alreadyHasUser.length}`);
  console.log('\n🔑 NEXT STEPS:');
  console.log('   1. Go to Supabase → Authentication → Users');
  console.log('   2. Click on each new user');
  console.log('   3. Click "Send password recovery" to invite them');
  console.log('   4. They\'ll get an email to set their password\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
