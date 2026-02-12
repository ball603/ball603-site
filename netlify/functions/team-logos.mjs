// Ball603 Team Logos API
// Netlify Function: /.netlify/functions/team-logos
// Returns list of available logos for CMS dropdown
// Logo assignments are stored in the teams table (logo_filename column)

// All available logo filenames (based on actual files in /logos/ folders)
// This list populates the dropdown in the CMS Teams editor
const AVAILABLE_LOGOS = [
  // High Schools
  'Alvirne.png',
  'Bedford.png',
  'Belmont.png',
  'Berlin.png',
  'BishopBrady.png',
  'BishopGuertin.png',
  'Bow.png',
  'Campbell.png',
  'CentralWest.png',
  'CoeBrown.png',
  'Colebrook.png',
  'Conant.png',
  'Concord.png',
  'ConcordChristian.png',
  'ConVal.png',
  'Derryfield.png',
  'Dover.png',
  'Epping.png',
  'Exeter.png',
  'FallMountain.png',
  'Farmington.png',
  'Franklin.png',
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
  'Portsmouth.png',
  'PortsmouthChristian.png',
  'Profile.png',
  'ProspectMountain.png',
  'Raymond.png',
  'Salem.png',
  'Sanborn.png',
  'Somersworth.png',
  'Souhegan.png',
  'Spaulding.png',
  'Stevens.png',
  'StThomasAquinas.png',
  'Sunapee.png',
  'Timberlane.png',
  'Trinity.png',
  'WhiteMountains.png',
  'WiltonLyndeborough.png',
  'Windham.png',
  'Winnacunnet.png',
  'Winnisquam.png',
  'Woodsville.png',
  
  // Colleges
  'ColbySawyer.png',
  'Dartmouth.png',
  'FranklinPierce.png',
  'KeeneState.png',
  'NewEnglandCollege.png',
  'PlymouthState.png',
  'Rivier.png',
  'SaintAnselm.png',
  'SouthernNewHampshire.png',
  'UNH.png',
  
  // Other
  'Ball603.png',
  'Ball603-white.png',
  'NHIAA.png',
];

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    // Return list of all available logo filenames for dropdown
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        logos: AVAILABLE_LOGOS,
        count: AVAILABLE_LOGOS.length
      })
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
