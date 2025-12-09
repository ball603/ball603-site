// netlify/functions/contributor-invite.mjs
// Handles inviting new contributors via Supabase Auth REST API

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SITE_URL = process.env.URL || 'https://ball603.com';

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
      case 'invite':
        return await inviteContributor(data, headers);
      case 'reset-password':
        return await sendPasswordReset(data, headers);
      case 'bulk-invite':
        return await bulkInvite(data, headers);
      case 'delete':
        return await deleteContributor(data, headers);
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
  // The invite endpoint is /auth/v1/invite, not /auth/v1/admin/invite
  const url = endpoint === 'invite' 
    ? `${SUPABASE_URL}/auth/v1/invite`
    : `${SUPABASE_URL}/auth/v1/admin/${endpoint}`;
    
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
  
  // Try to parse JSON, but handle non-JSON responses
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      // Response is not JSON
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

// Invite a single new contributor
async function inviteContributor(data, headers) {
  const { name, email, is_photographer, is_videographer, is_writer, is_graphics } = data;

  if (!name || !email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name and email are required' }) };
  }

  // Check if contributor already exists
  const { data: existing } = await supabaseRest(
    `contributors?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,auth_user_id`
  );

  if (existing && existing.length > 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'A contributor with this email already exists' }) };
  }

  // Create Supabase Auth user with invite
  const { data: authUser, error: authError } = await supabaseAuthAdmin('invite', 'POST', {
    email: email,
    data: { name: name }
  });

  if (authError || !authUser) {
    console.error('Auth invite error:', authError);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send invite: ' + (authError?.message || 'Unknown error') }) };
  }

  // Get user ID - response might have different structures
  const userId = authUser.id || authUser.user?.id;
  
  if (!userId) {
    console.error('No user ID in response:', authUser);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to get user ID from invite response' }) };
  }

  // Create contributor record
  const { data: contributor, error: dbError } = await supabaseRest('contributors', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email: email.toLowerCase(),
      auth_user_id: userId,
      smugmug_name: name,
      is_photographer: is_photographer || false,
      is_videographer: is_videographer || false,
      is_writer: is_writer || false,
      is_graphics: is_graphics || false,
      active: true
    })
  });

  if (dbError) {
    console.error('DB insert error:', dbError);
    // Try to clean up the auth user
    await supabaseAuthAdmin(`users/${userId}`, 'DELETE');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create contributor record' }) };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ success: true, message: `Invite sent to ${email}`, contributor: contributor?.[0] }) 
  };
}

// Send password reset to existing contributor
async function sendPasswordReset(data, headers) {
  const { email } = data;

  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
  }

  // Check if contributor exists
  const { data: contributors } = await supabaseRest(
    `contributors?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,auth_user_id,name`
  );

  if (!contributors || contributors.length === 0) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Contributor not found' }) };
  }

  const contributor = contributors[0];

  // If contributor doesn't have an auth account yet, create one via invite
  if (!contributor.auth_user_id) {
    const { data: authUser, error: authError } = await supabaseAuthAdmin('invite', 'POST', {
      email: email,
      data: { name: contributor.name }
    });

    if (authError || !authUser) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send invite: ' + (authError?.message || 'Unknown error') }) };
    }

    const userId = authUser.id || authUser.user?.id;

    // Link auth user to contributor
    await supabaseRest(`contributors?id=eq.${contributor.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ auth_user_id: userId })
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `Invite sent to ${email} (new account created)` }) };
  }

  // Generate password recovery link for existing user
  const { data: linkData, error: linkError } = await supabaseAuthAdmin('generate_link', 'POST', {
    type: 'recovery',
    email: email,
    redirect_to: `${SITE_URL}/contributor-portal.html`
  });

  if (linkError) {
    // Fallback: Use the regular password reset endpoint
    const resetResponse = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        redirect_to: `${SITE_URL}/contributor-portal.html`
      })
    });

    if (!resetResponse.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send reset email' }) };
    }
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: `Password reset sent to ${email}` }) };
}

// Bulk invite existing contributors who don't have auth accounts
async function bulkInvite(data, headers) {
  const { contributorIds } = data;

  if (!contributorIds || !Array.isArray(contributorIds) || contributorIds.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'contributorIds array is required' }) };
  }

  // Get contributors without auth accounts
  const idList = contributorIds.join(',');
  const { data: contributors, error } = await supabaseRest(
    `contributors?id=in.(${idList})&auth_user_id=is.null&select=id,name,email`
  );

  if (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch contributors' }) };
  }

  const results = { success: [], failed: [] };

  for (const contrib of contributors || []) {
    try {
      const { data: authUser, error: authError } = await supabaseAuthAdmin('invite', 'POST', {
        email: contrib.email,
        data: { name: contrib.name }
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

      // Rate limit: wait 100ms between invites
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
      message: `Sent ${results.success.length} invites, ${results.failed.length} failed`,
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
