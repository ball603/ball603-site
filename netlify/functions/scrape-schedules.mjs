// Ball603 NHIAA Schedule Scraper - DEBUG VERSION
// This version logs HTML samples to help fix parsing

const SCHEDULE_URLS = [
  { url: 'https://www.nhiaa.org/sports/schedules/boys-basketball/division-4', gender: 'Boys', division: 'D-IV' },
];

export default async (request) => {
  console.log('Ball603 Schedule Scraper - DEBUG VERSION');
  
  try {
    const response = await fetch(SCHEDULE_URLS[0].url);
    const html = await response.text();
    
    // Log HTML length
    console.log(`HTML length: ${html.length} characters`);
    
    // Log first 2000 chars after "Schedules:" heading
    const schedStart = html.indexOf('Schedules:');
    if (schedStart > -1) {
      console.log('Found "Schedules:" at position:', schedStart);
      console.log('Sample HTML after Schedules:');
      console.log(html.substring(schedStart, schedStart + 2000));
    } else {
      console.log('Did not find "Schedules:" in HTML');
      // Log around position 50000 where content likely is
      console.log('Sample from middle of page:');
      console.log(html.substring(50000, 52000));
    }
    
    // Look for Colebrook specifically (first team in D-IV)
    const colebrookPos = html.indexOf('Colebrook');
    if (colebrookPos > -1) {
      console.log('Found "Colebrook" at position:', colebrookPos);
      console.log('HTML around Colebrook:');
      console.log(html.substring(colebrookPos - 100, colebrookPos + 500));
    } else {
      console.log('Did not find "Colebrook" in HTML');
    }
    
    // Look for a date pattern
    const dateMatch = html.match(/\d{2}\/\d{2}\/\d{2}/);
    if (dateMatch) {
      const datePos = html.indexOf(dateMatch[0]);
      console.log('Found date pattern at position:', datePos);
      console.log('HTML around first date:');
      console.log(html.substring(datePos - 200, datePos + 300));
    } else {
      console.log('Did not find any date patterns (MM/DD/YY)');
    }
    
    return new Response(JSON.stringify({
      success: true,
      htmlLength: html.length,
      message: 'Check logs for HTML samples'
    }), { status: 200 });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const config = {
  schedule: "0 10,17,3 * * *"
};
