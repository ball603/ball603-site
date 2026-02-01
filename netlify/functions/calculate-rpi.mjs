// Ball603 Scheduled RPI Calculator
// Runs Monday 6 AM ET (11 AM UTC) via netlify.toml schedule
// This is a scheduled function - it cannot be called via HTTP
// For manual triggers, use publish-rpi.mjs instead

export default async () => {
  const SITE_URL = process.env.URL || 'https://ball603.com';
  
  try {
    console.log('Scheduled RPI calculation triggered...');
    
    const response = await fetch(`${SITE_URL}/.netlify/functions/publish-rpi`, {
      method: 'POST'
    });
    
    const text = await response.text();
    console.log('publish-rpi response:', response.status, text.substring(0, 500));
    
  } catch (err) {
    console.error('Scheduled RPI error:', err.message);
  }
};
