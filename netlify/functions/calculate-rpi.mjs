// Ball603 RPI Calculator, the scheduled copy.
//
// NOT SCHEDULED any more. netlify.toml has no entry for this function: RPI is
// published by hand from the CMS for every sport, deliberately, because a week
// that turns over with results still missing produces a ranking nobody wants.
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
