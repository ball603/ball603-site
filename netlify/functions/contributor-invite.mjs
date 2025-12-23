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
      case 'create-login':
        return await createLoginForExisting(data, headers);
      case 'set-password':
        return await setPassword(data, headers);
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

// Create login account for an EXISTING contributor (no auth account yet)
async function createLoginForExisting(data, headers) {
  const { contributorId, email, name, password } = data;

  if (!contributorId || !email || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'contributorId, email, and password are required' }) };
  }

  // Verify contributor exists and doesn't have auth account
  const { data: existing } = await supabaseRest(
    `contributors?id=eq.${contributorId}&select=id,auth_user_id,email`
  );

  if (!existing || existing.length === 0) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Contributor not found' }) };
  }

  if (existing[0].auth_user_id) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Contributor already has a login account' }) };
  }

  // Try to create Supabase Auth user with password
  const { data: authUser, error: authError } = await supabaseAuthAdmin('users', 'POST', {
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: { name: name || email }
  });

  let userId = null;

  if (authError) {
    // Check if user already exists - if so, find them and link
    if (authError.message && authError.message.includes('already been registered')) {
      console.log('User already exists, attempting to find and link...');
      
      // List users and find by email
      const { data: userList, error: listError } = await supabaseAuthAdmin('users', 'GET');
      
      if (listError || !userList) {
        console.error('Failed to list users:', listError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'User exists but could not be found. Try deleting from Supabase Auth first.' }) };
      }
      
      // Find user by email (userList might be an object with users array)
      const users = userList.users || userList;
      const existingUser = Array.isArray(users) ? users.find(u => u.email?.toLowerCase() === email.toLowerCase()) : null;
      
      if (!existingUser) {
        console.error('Could not find existing user by email');
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'User exists but could not be found by email. Try deleting from Supabase Auth first.' }) };
      }
      
      userId = existingUser.id;
      
      // Update their password while we're at it
      await supabaseAuthAdmin(`users/${userId}`, 'PUT', { password: password });
      
    } else {
      console.error('Auth create error:', authError);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create login: ' + (authError?.message || 'Unknown error') }) };
    }
  } else {
    userId = authUser.id || authUser.user?.id;
  }

  if (!userId) {
    console.error('No user ID found');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get user ID' }) };
  }

  // Link auth user to existing contributor
  const { error: linkError } = await supabaseRest(`contributors?id=eq.${contributorId}`, {
    method: 'PATCH',
    body: JSON.stringify({ auth_user_id: userId })
  });

  if (linkError) {
    console.error('Link error:', linkError);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to link account to contributor' }) };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ success: true, message: `Login linked for ${email}`, authUserId: userId }) 
  };
}

// Set/reset password for existing auth user
async function setPassword(data, headers) {
  const { authUserId, password } = data;

  if (!authUserId || !password) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'authUserId and password are required' }) };
  }

  if (password.length < 6) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
  }

  // Update user password via Admin API
  const { data: updatedUser, error: updateError } = await supabaseAuthAdmin(`users/${authUserId}`, 'PUT', {
    password: password
  });

  if (updateError) {
    console.error('Password update error:', updateError);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to set password: ' + (updateError?.message || 'Unknown error') }) };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ success: true, message: 'Password updated successfully' }) 
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
