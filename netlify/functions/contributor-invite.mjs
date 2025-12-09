// netlify/functions/contributor-invite.mjs
// Handles inviting new contributors via Supabase Auth

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export async function handler(event) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { action, ...data } = JSON.parse(event.body);
    
    // Initialize Supabase with service role key (admin access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    switch (action) {
      case 'invite':
        return await inviteContributor(supabase, data, headers);
      
      case 'reset-password':
        return await sendPasswordReset(supabase, data, headers);
      
      case 'bulk-invite':
        return await bulkInvite(supabase, data, headers);
      
      default:
        return { 
          statusCode: 400, 
          headers, 
          body: JSON.stringify({ error: 'Invalid action' }) 
        };
    }

  } catch (error) {
    console.error('Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
}

// Invite a single new contributor
async function inviteContributor(supabase, data, headers) {
  const { name, email, is_photographer, is_videographer, is_writer, is_graphics } = data;

  if (!name || !email) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: 'Name and email are required' }) 
    };
  }

  // Check if contributor already exists
  const { data: existing } = await supabase
    .from('contributors')
    .select('id, auth_user_id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: 'A contributor with this email already exists' }) 
    };
  }

  // Create Supabase Auth user with invite
  const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.URL || 'https://ball603.com'}/contributor-portal.html`
  });

  if (authError) {
    console.error('Auth invite error:', authError);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Failed to send invite: ' + authError.message }) 
    };
  }

  // Create contributor record
  const { data: contributor, error: dbError } = await supabase
    .from('contributors')
    .insert({
      name,
      email: email.toLowerCase(),
      auth_user_id: authUser.user.id,
      smugmug_name: name,
      is_photographer: is_photographer || false,
      is_videographer: is_videographer || false,
      is_writer: is_writer || false,
      is_graphics: is_graphics || false,
      active: true
    })
    .select()
    .single();

  if (dbError) {
    console.error('DB insert error:', dbError);
    // Try to clean up the auth user if DB insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Failed to create contributor record' }) 
    };
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ 
      success: true, 
      message: `Invite sent to ${email}`,
      contributor
    }) 
  };
}

// Send password reset to existing contributor
async function sendPasswordReset(supabase, data, headers) {
  const { email } = data;

  if (!email) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: 'Email is required' }) 
    };
  }

  // Check if contributor exists
  const { data: contributor } = await supabase
    .from('contributors')
    .select('id, auth_user_id, name')
    .eq('email', email.toLowerCase())
    .single();

  if (!contributor) {
    return { 
      statusCode: 404, 
      headers, 
      body: JSON.stringify({ error: 'Contributor not found' }) 
    };
  }

  // If contributor doesn't have an auth account yet, create one via invite
  if (!contributor.auth_user_id) {
    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.URL || 'https://ball603.com'}/contributor-portal.html`
    });

    if (authError) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Failed to send invite: ' + authError.message }) 
      };
    }

    // Link auth user to contributor
    await supabase
      .from('contributors')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', contributor.id);

    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        success: true, 
        message: `Invite sent to ${email} (new account created)`
      }) 
    };
  }

  // Send password reset for existing auth user
  const { error: resetError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email,
    options: {
      redirectTo: `${process.env.URL || 'https://ball603.com'}/contributor-portal.html`
    }
  });

  if (resetError) {
    // Fallback: try the regular reset method
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.URL || 'https://ball603.com'}/contributor-portal.html`
    });
    
    if (error) {
      return { 
        statusCode: 500, 
        headers, 
        body: JSON.stringify({ error: 'Failed to send reset email' }) 
      };
    }
  }

  return { 
    statusCode: 200, 
    headers, 
    body: JSON.stringify({ 
      success: true, 
      message: `Password reset sent to ${email}`
    }) 
  };
}

// Bulk invite existing contributors who don't have auth accounts
async function bulkInvite(supabase, data, headers) {
  const { contributorIds } = data;

  if (!contributorIds || !Array.isArray(contributorIds) || contributorIds.length === 0) {
    return { 
      statusCode: 400, 
      headers, 
      body: JSON.stringify({ error: 'contributorIds array is required' }) 
    };
  }

  // Get contributors without auth accounts
  const { data: contributors, error } = await supabase
    .from('contributors')
    .select('id, name, email, auth_user_id')
    .in('id', contributorIds)
    .is('auth_user_id', null);

  if (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Failed to fetch contributors' }) 
    };
  }

  const results = {
    success: [],
    failed: []
  };

  for (const contrib of contributors) {
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(contrib.email, {
        redirectTo: `${process.env.URL || 'https://ball603.com'}/contributor-portal.html`
      });

      if (authError) {
        results.failed.push({ email: contrib.email, error: authError.message });
        continue;
      }

      // Link auth user to contributor
      await supabase
        .from('contributors')
        .update({ auth_user_id: authUser.user.id })
        .eq('id', contrib.id);

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
