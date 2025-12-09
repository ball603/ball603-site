// netlify/functions/contributor-invite.mjs
// Handles creating/deleting contributor accounts via Supabase Auth REST API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, ...data } = JSON.parse(event.body);

    switch (action) {
      case 'create-account':
        return await createAccount(data, headers);
      case 'delete':
        return await deleteContributor(data, headers);
      case 'bulk-create':
        return await bulkCreateAccounts(data, headers);
      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action' }) };
    }
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}

// Helper: Supabase REST API call
async function supabaseRest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers
    }
  });
  
  const text = await response.text();
  return {
    data: text ? JSON.parse(text) : null,
    error: response.ok ? null : { message: text },
    status: response.status
  };
}

// Helper: Supabase Auth Admin API call
async function supabaseAuthAdmin(endpoint, method = 'POST', body = null) {
  const url = `${SUPABASE_URL}/auth/v1/admin/${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  
  const text = await response.text();
  let data = null;
  
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      return {
        data: null,
        error: { message: text || 'Unknown error' },
        status: response.status
      };
    }
  }
  
  return {
    data: data,
    error: response.ok ? null : { message: data?.error_description || data?.message || data?.msg || text },
    status: response.status
  };
}

// Create a single account with specified password
async function createAccount(data, headers) {
  const { name, email, password } = data;

  if (!name || !email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and password are required' }) };
  }

  // Check if contributor already exists
  const { data: existing } = await supabaseRest(
    `contributors?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,auth_user_id`
  );

  if (existing && existing.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A contributor with this email already exists' }) };
  }

  // Create Supabase Auth user with password
  const { data: authUser, error: authError } = await supabaseAuthAdmin('users', 'POST', {
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name: name }
  });

  if (authError || !authUser) {
    console.error('Auth create error:', authError);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create account: ' + (authError?.message || 'Unknown error') }) };
  }

  const userId = authUser.id || authUser.user?.id;

  if (!userId) {
    console.error('No user ID in response:', authUser);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get user ID from response' }) };
  }

  // Create contributor record
  const { data: contributor, error: dbError } = await supabaseRest('contributors', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email: email.toLowerCase(),
      auth_user_id: userId,
      smugmug_name: name,
      active: true
    })
  });

  if (dbError) {
    console.error('DB insert error:', dbError);
    await supabaseAuthAdmin(`users/${userId}`, 'DELETE');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create contributor record' }) };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ success: true, message: `Account created for ${email}`, contributor: contributor?.[0] }) 
  };
}

// Bulk create accounts for existing contributors without auth accounts
async function bulkCreateAccounts(data, headers) {
  const { password } = data;

  if (!password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password is required' }) };
  }

  // Get all contributors without auth accounts
  const { data: contributors, error } = await supabaseRest(
    `contributors?auth_user_id=is.null&select=id,name,email`
  );

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch contributors' }) };
  }

  if (!contributors || contributors.length === 0) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'No contributors without accounts found', results: { success: [], failed: [] } }) };
  }

  const results = { success: [], failed: [] };

  for (const contrib of contributors) {
    try {
      // Create auth user with password
      const { data: authUser, error: authError } = await supabaseAuthAdmin('users', 'POST', {
        email: contrib.email,
        password: password,
        email_confirm: true,
        user_metadata: { name: contrib.name }
      });

      if (authError || !authUser) {
        results.failed.push({ email: contrib.email, error: authError?.message || 'Unknown error' });
        continue;
      }

      const userId = authUser.id || authUser.user?.id;

      // Link auth user to contributor
      await supabaseRest(`contributors?id=eq.${contrib.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ auth_user_id: userId })
      });

      results.success.push(contrib.email);

      // Rate limit: wait 100ms between creates
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      results.failed.push({ email: contrib.email, error: err.message });
    }
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ 
      success: true, 
      message: `Created ${results.success.length} accounts, ${results.failed.length} failed`,
      results
    }) 
  };
}

// Delete a contributor and their auth account
async function deleteContributor(data, headers) {
  const { contributorId } = data;

  if (!contributorId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'contributorId is required' }) };
  }

  // Get contributor to find auth_user_id
  const { data: contributors } = await supabaseRest(
    `contributors?id=eq.${contributorId}&select=id,name,email,auth_user_id`
  );

  if (!contributors || contributors.length === 0) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Contributor not found' }) };
  }

  const contributor = contributors[0];

  // Delete auth user if exists
  if (contributor.auth_user_id) {
    await supabaseAuthAdmin(`users/${contributor.auth_user_id}`, 'DELETE');
  }

  // Delete portfolio items first (foreign key constraint)
  await supabaseRest(`contributor_portfolio?contributor_id=eq.${contributorId}`, {
    method: 'DELETE'
  });

  // Delete contributor record
  const { error: deleteError } = await supabaseRest(`contributors?id=eq.${contributorId}`, {
    method: 'DELETE'
  });

  if (deleteError) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to delete contributor' }) };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ success: true, message: `Deleted ${contributor.name}` }) 
  };
}
