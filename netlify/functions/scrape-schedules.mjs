// Ball603 NHIAA Schedule Scraper - DEBUG VERSION 2
// Looking at actual HTML structure

const SCHEDULE_URLS = [
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-4', gender: 'Boys', division: 'D-IV' },
];

export default async (request) => {
  console.log('Ball603 Schedule Scraper - DEBUG VERSION 2');
  
  try {
    const response = await fetch(SCHEDULE_URLS[0].url);
    const html = await response.text();
    
    // Find Colebrook and show surrounding HTML
    const colebrookPos = html.indexOf('Colebrook');
    if (colebrookPos > -1) {
      console.log('=== HTML around Colebrook (team section start) ===');
      console.log(html.substring(colebrookPos - 50, colebrookPos + 800));
    }
    
    // Find first date 12/05/25
    const datePos = html.indexOf('12/05/25');
    if (datePos > -1) {
      console.log('=== HTML around first date 12/05/25 ===');
      console.log(html.substring(datePos - 100, datePos + 400));
    }
    
    // Show what tags are used
    console.log('=== Checking for li tags ===');
    const liCount = (html.match(/<li/gi) || []).length;
    console.log(`Found ${liCount} <li> tags`);
    
    console.log('=== Checking for h2 tags ===');
    const h2Count = (html.match(/<h2/gi) || []).length;
    console.log(`Found ${h2Count} <h2> tags`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Check logs'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const config = {
  schedule: "0 10,17,3 * * *"
};
