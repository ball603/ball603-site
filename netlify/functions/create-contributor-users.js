/**
 * Ball603 Contributor User Creation - Netlify Function
 * 
 * Creates Supabase Auth users for all active contributors.
 * Does NOT send password recovery emails.
 * 
 * Trigger: https://ball603.com/.netlify/functions/create-contributor-users
 * 
 * Requires environment variables in Netlify:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function getActiveContributors() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/contributors?select=id,name,email,active&active=eq.true`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get contributors: ${await response.text()}`);
  }
  
  return response.json();
}

async function getExistingAuthUsers() {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get auth users: ${await response.text()}`);
  }
  
  const data = await response.json();
  return data.users || [];
}

async function createAuthUser(email) {
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
      email_confirm: true,
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.msg || data.message || JSON.stringify(data));
  }
  
  return data;
}

exports.handler = async function(event, context) {
  // Check for service key
  if (!SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_KEY environment variable' })
    };
  }
  
  try {
    // Get active contributors
    const contributors = await getActiveContributors();
    
    // Get existing auth users
    const existingUsers = await getExistingAuthUsers();
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    
    // Find who needs Auth users
    const needsUser = contributors.filter(c => !existingEmails.has(c.email.toLowerCase()));
    const alreadyHasUser = contributors.filter(c => existingEmails.has(c.email.toLowerCase()));
    
    // Create Auth users
    const results = {
      alreadyExisted: alreadyHasUser.map(c => ({ name: c.name, email: c.email })),
      created: [],
      failed: []
    };
    
    for (const contributor of needsUser) {
      try {
        await createAuthUser(contributor.email);
        results.created.push({ name: contributor.name, email: contributor.email });
      } catch (err) {
        results.failed.push({ name: contributor.name, email: contributor.email, error: err.message });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: {
          totalContributors: contributors.length,
          alreadyExisted: results.alreadyExisted.length,
          created: results.created.length,
          failed: results.failed.length
        },
        details: results,
        nextSteps: [
          'Go to Supabase → Authentication → Users',
          'Click on each new user',
          'Click "Send password recovery" to invite them'
        ]
      }, null, 2)
    };
    
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
