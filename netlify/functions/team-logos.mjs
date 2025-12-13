// Ball603 Team Logos API
// Netlify Function: /.netlify/functions/team-logos
// - GET: List available logos or get team->logo mapping
// - POST with action=migrate: One-time migration to set logo_filename for all teams

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://suncdkxfqkwwnmhosxcf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Complete mapping of team shortnames to logo filenames
const LOGO_MAP = {
  // High Schools
  'Alvirne': 'Alvirne.png',
  'Bedford': 'Bedford.png',
  'Belmont': 'Belmont.png',
  'Berlin': 'Berlin.png',
  'Bishop Brady': 'BishopBrady.png',
  'Bishop Guertin': 'BishopGuertin.png',
  'Bow': 'Bow.png',
  'Campbell': 'Campbell.png',
  'Coe-Brown': 'CoeBrown.png',
  'Colebrook': 'Colebrook.png',
  'Conant': 'Conant.png',
  'Concord': 'Concord.png',
  'Concord Christian': 'ConcordChristian.png',
  'ConVal': 'ConVal.png',
  'Derryfield': 'Derryfield.png',
  'Dover': 'Dover.png',
  'Epping': 'Epping.png',
  'Exeter': 'Exeter.png',
  'Fall Mountain': 'FallMountain.png',
  'Farmington': 'Farmington.png',
  'Franklin': 'Franklin.png',
  'Gilford': 'Gilford.png',
  'Goffstown': 'Goffstown.png',
  'Gorham': 'Gorham.png',
  'Groveton': 'Groveton.png',
  'Hanover': 'Hanover.png',
  'Hillsboro-Deering': 'HillsboroDeering.png',
  'Hinsdale': 'Hinsdale.png',
  'Hollis-Brookline': 'HollisBrookline.png',
  'Holy Family': 'HolyFamily.png',
  'Hopkinton': 'Hopkinton.png',
  'Inter-Lakes': 'InterLakes.png',
  'John Stark': 'JohnStark.png',
  'Kearsarge': 'Kearsarge.png',
  'Keene': 'Keene.png',
  'Kennett': 'Kennett.png',
  'Kingswood': 'Kingswood.png',
  'Laconia': 'Laconia.png',
  'Lebanon': 'Lebanon.png',
  'Lin-Wood': 'LinWood.png',
  'Lisbon': 'Lisbon.png',
  'Littleton': 'Littleton.png',
  'Londonderry': 'Londonderry.png',
  'Manchester Central': 'ManchesterCentral.png',
  'Manchester Memorial': 'ManchesterMemorial.png',
  'Manchester West': 'ManchesterWest.png',
  'Mascenic': 'Mascenic.png',
  'Mascoma Valley': 'Mascoma.png',
  'Merrimack': 'Merrimack.png',
  'Merrimack Valley': 'MerrimackValley.png',
  'Milford': 'Milford.png',
  'Monadnock': 'Monadnock.png',
  'Moultonborough': 'Moultonborough.png',
  'Mount Royal': 'MountRoyal.png',
  'Nashua North': 'NashuaNorth.png',
  'Nashua South': 'NashuaSouth.png',
  'Newfound': 'Newfound.png',
  'Newmarket': 'Newmarket.png',
  'Newport': 'Newport.png',
  'Nute': 'Nute.png',
  'Oyster River': 'OysterRiver.png',
  'Pelham': 'Pelham.png',
  'Pembroke': 'Pembroke.png',
  'Pinkerton': 'Pinkerton.png',
  'Pittsburg': 'Pittsburg.png',
  'Pittsburg-Canaan': 'PittsburgCanaan.png',
  'Pittsfield': 'Pittsfield.png',
  'Plymouth': 'Plymouth.png',
  'Portsmouth': 'Portsmouth.png',
  'Portsmouth Christian': 'PortsmouthChristian.png',
  'Profile': 'Profile.png',
  'Prospect Mountain': 'ProspectMountain.png',
  'Raymond': 'Raymond.png',
  'Salem': 'Salem.png',
  'Sanborn': 'Sanborn.png',
  'Somersworth': 'Somersworth.png',
  'Souhegan': 'Souhegan.png',
  'Spaulding': 'Spaulding.png',
  'Stevens': 'Stevens.png',
  'St. Thomas Aquinas': 'StThomasAquinas.png',
  'Sunapee': 'Sunapee.png',
  'Timberlane': 'Timberlane.png',
  'Trinity': 'Trinity.png',
  'White Mountains': 'WhiteMountains.png',
  'Wilton-Lyndeborough': 'WiltonLyndeborough.png',
  'Windham': 'Windham.png',
  'Winnacunnet': 'Winnacunnet.png',
  'Winnisquam': 'Winnisquam.png',
  'Woodsville': 'Woodsville.png',
  
  // Colleges
  'Colby-Sawyer': 'ColbySawyer.png',
  'Dartmouth': 'Dartmouth.png',
  'Franklin Pierce': 'FranklinPierce.png',
  'Keene State': 'KeeneState.png',
  'New England College': 'NewEnglandCollege.png',
  'Plymouth State': 'PlymouthState.png',
  'Rivier': 'Rivier.png',
  'Saint Anselm': 'SaintAnselm.png',
  'Southern New Hampshire': 'SouthernNewHampshire.png',
  'SNHU': 'SouthernNewHampshire.png',
  'UNH': 'UNH.png',
};

// All available logo filenames
const AVAILABLE_LOGOS = [
  'Alvirne.png',
  'Bedford.png',
  'Belmont.png',
  'Berlin.png',
  'BishopBrady.png',
  'BishopGuertin.png',
  'Bow.png',
  'Campbell.png',
  'CoeBrown.png',
  'ColbySawyer.png',
  'Colebrook.png',
  'Conant.png',
  'Concord.png',
  'ConcordChristian.png',
  'ConVal.png',
  'Dartmouth.png',
  'Derryfield.png',
  'Dover.png',
  'Epping.png',
  'Exeter.png',
  'FallMountain.png',
  'Farmington.png',
  'Franklin.png',
  'FranklinPierce.png',
  'Gilford.png',
  'Goffstown.png',
  'Gorham.png',
  'Groveton.png',
  'Hanover.png',
  'HillsboroDeering.png',
  'Hinsdale.png',
  'HollisBrookline.png',
  'HolyFamily.png',
  'Hopkinton.png',
  'InterLakes.png',
  'JohnStark.png',
  'Kearsarge.png',
  'Keene.png',
  'KeeneState.png',
  'Kennett.png',
  'Kingswood.png',
  'Laconia.png',
  'Lebanon.png',
  'LinWood.png',
  'Lisbon.png',
  'Littleton.png',
  'Londonderry.png',
  'ManchesterCentral.png',
  'ManchesterMemorial.png',
  'ManchesterWest.png',
  'Mascenic.png',
  'Mascoma.png',
  'Merrimack.png',
  'MerrimackValley.png',
  'Milford.png',
  'Monadnock.png',
  'Moultonborough.png',
  'MountRoyal.png',
  'NashuaNorth.png',
  'NashuaSouth.png',
  'NewEnglandCollege.png',
  'Newfound.png',
  'Newmarket.png',
  'Newport.png',
  'Nute.png',
  'OysterRiver.png',
  'Pelham.png',
  'Pembroke.png',
  'Pinkerton.png',
  'PittsburgCanaan.png',
  'Pittsfield.png',
  'Plymouth.png',
  'PlymouthState.png',
  'Portsmouth.png',
  'PortsmouthChristian.png',
  'Profile.png',
  'ProspectMountain.png',
  'Raymond.png',
  'Rivier.png',
  'SaintAnselm.png',
  'Salem.png',
  'Sanborn.png',
  'Somersworth.png',
  'Souhegan.png',
  'SouthernNewHampshire.png',
  'Spaulding.png',
  'Stevens.png',
  'StThomasAquinas.png',
  'Sunapee.png',
  'Timberlane.png',
  'Trinity.png',
  'UNH.png',
  'WhiteMountains.png',
  'WiltonLyndeborough.png',
  'Windham.png',
  'Winnacunnet.png',
  'Winnisquam.png',
  'Woodsville.png',
];

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const method = event.httpMethod;
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    // GET - List available logos or get the mapping
    if (method === 'GET') {
      if (params.list === 'true') {
        // Return list of all available logo filenames
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            logos: AVAILABLE_LOGOS,
            count: AVAILABLE_LOGOS.length
          })
        };
      }
      
      if (params.shortname) {
        // Get logo for specific team
        const logo = LOGO_MAP[params.shortname] || null;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            shortname: params.shortname,
            logo_filename: logo
          })
        };
      }

      // Return full mapping
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          mapping: LOGO_MAP,
          available: AVAILABLE_LOGOS
        })
      };
    }

    // POST - Migration action
    if (method === 'POST' && body.action === 'migrate') {
      // Fetch all teams
      const teamsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/teams?select=id,shortname,logo_filename&limit=1000`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!teamsResponse.ok) {
        throw new Error('Failed to fetch teams');
      }

      const teams = await teamsResponse.json();
      let updated = 0;
      let skipped = 0;
      let notFound = [];

      for (const team of teams) {
        // Skip if already has a logo_filename set
        if (team.logo_filename) {
          skipped++;
          continue;
        }

        const logoFilename = LOGO_MAP[team.shortname];
        
        if (logoFilename) {
          // Update the team with the logo_filename
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/teams?id=eq.${team.id}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ logo_filename: logoFilename })
            }
          );

          if (updateResponse.ok) {
            updated++;
          }
        } else {
          notFound.push(team.shortname);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Migration complete',
          results: {
            total: teams.length,
            updated,
            skipped,
            notFound
          }
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid request' })
    };

  } catch (error) {
    console.error('Team logos API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
}
