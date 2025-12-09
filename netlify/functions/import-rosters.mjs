// import-rosters.mjs
// One-time Netlify function to import existing rosters from rosters_data.js
// Run once, then delete this function
// 
// To use: Deploy, then visit /.netlify/functions/import-rosters?confirm=yes

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// All 54 rosters from rosters_data.js
const ROSTERS_TO_IMPORT = 
[
  {
    "school": "Nute",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Ellie Hopkins",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Halia Hathorn",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "4",
        "name": "Penny Meehan",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Hannah Cartier",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Bella Colby",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Carlee LaPanne",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Olivia Cartier",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Azlyn Picard",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Siena Picard",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "30",
        "name": "Bianca LaPierre",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "31",
        "name": "Abby D'Entremont",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "32",
        "name": "Brooke LaPierre",
        "class": "JR",
        "position": "F/C"
      }
    ],
    "head_coach": "Ed Janis",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Littleton",
    "gender": "Girls",
    "players": [
      {
        "number": "12",
        "name": "Ella Horsch",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "13",
        "name": "Rylee Hampson",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "14",
        "name": "Miyah Akines",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Addison Pilgrim",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Taylor Martin",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Juju Bromley",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "23",
        "name": "Madison Nelson",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Somaya Smothers",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "25",
        "name": "Leah Poulton",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "31",
        "name": "Ashtyn Chadburn",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "34",
        "name": "Nevaeh Monahan",
        "class": "FR",
        "position": "G"
      }
    ],
    "head_coach": "Dale Prior",
    "assistant_coaches": "",
    "managers": "Sadie Roberts"
  },
  {
    "school": "Littleton",
    "gender": "Boys",
    "players": [
      {
        "number": "2",
        "name": "Marcus Hampson",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Sam Reagey",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Mason Allaire",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Connor Roy",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Daven Reagey",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Jackson Cook",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Jerson Perez",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Owen Norrie",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Whalen Lemire",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Caleb Regnet",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Ashton Collins",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Lucas White",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "33",
        "name": "Ryan Mahy",
        "class": "SR",
        "position": "F"
      }
    ],
    "head_coach": "Trevor Howard",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Colebrook",
    "gender": "Girls",
    "players": [
      {
        "number": "2",
        "name": "Madison Parker",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Ashlynn Rudd",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Lindsey Eldridge",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "10",
        "name": "Haley Rossitto",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "11",
        "name": "Kaelyn Fournier",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Ryli Lebel",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Kelly Frizzell",
        "class": "8th",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Carly Daigneault",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Lexi Santamaria",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "21",
        "name": "Samantha Samson",
        "class": "SR",
        "position": "G/F"
      }
    ],
    "head_coach": "Duane Call",
    "assistant_coaches": "",
    "managers": "Lila Perry"
  },
  {
    "school": "Sunapee",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Sebastian Abraham",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "2",
        "name": "Mason Belanger",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Tyler Hughes",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Nicholi Silver",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Dylan Smith",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Eben Berube",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Solomon Abbott",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Sam Gaudet",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "25",
        "name": "Owen Abbott",
        "class": "SO",
        "position": "F"
      }
    ],
    "head_coach": "Timothy Puchtler",
    "assistant_coaches": "Evan Beal",
    "managers": ""
  },
  {
    "school": "Concord Christian",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Luke Farland",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Demarco Donini",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "3",
        "name": "Will Clark",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "4",
        "name": "Cameron Fortin",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Daniel Center",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "11",
        "name": "Jonas Blackwood",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Logan Smith",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "13",
        "name": "Anthony Owens",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Grady St Jean",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "15",
        "name": "Aleks DiLullo",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Reid Marshall",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Alex Solis",
        "class": "8th",
        "position": "G/F"
      },
      {
        "number": "24",
        "name": "Jordan Kirby",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "25",
        "name": "Graydon Smith",
        "class": "8th",
        "position": "G/F"
      }
    ],
    "head_coach": "Greg Farland",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Groveton",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Landon Cloutier",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Rownan Perkins",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Matt Hickey",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Ian Kennett",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Hunter Parks",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "10",
        "name": "Ashton Kenison",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Brady Hickey",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Nolan Kendall",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Grady Kenison",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Tyson Shannon",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Nate Mellett",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "32",
        "name": "Gage Collins",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "33",
        "name": "Jayden Supernois",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "35",
        "name": "Jacob Chappell",
        "class": "FR",
        "position": "G"
      }
    ],
    "head_coach": "Mark Collins",
    "assistant_coaches": "John Rooney",
    "managers": ""
  },
  {
    "school": "Franklin",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Sage Slocum",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Cyra Wyatt",
        "class": "8th",
        "position": "G/F"
      },
      {
        "number": "5",
        "name": "Bella LaFlamme",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Aaliyah Giberson",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Kayla Adams",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Taylor Croteau",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Payton Cloutier",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Maddie Doherty",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "23",
        "name": "Lily Cornell",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "33",
        "name": "Bella Tusi",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "43",
        "name": "Paytin Drew",
        "class": "FR",
        "position": "F"
      }
    ],
    "head_coach": "Cat Robbins",
    "assistant_coaches": "Maddie Trefethen",
    "managers": ""
  },
  {
    "school": "Groveton",
    "gender": "Girls",
    "players": [
      {
        "number": "2",
        "name": "Aubrey Hickey",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Emma Simino",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Julia Chappell",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Stephanie Klinch",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Makalyn Kenison",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "11",
        "name": "Luci Garcia",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Reagan Ramsay",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Callie Deblois",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Delaney Whiting",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Sophie Kenison",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Adison Lyon",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "25",
        "name": "Audrie Brasseur",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "35",
        "name": "Mylee Kenison",
        "class": "JR",
        "position": "F/C"
      }
    ],
    "head_coach": "Tim Haskins",
    "assistant_coaches": "",
    "managers": "Taylor Clauss"
  },
  {
    "school": "Farmington",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Josh Mosher",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Lucas Watson",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Andrew Lawson",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Alex Cutter",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Adrian Collado",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Jazar Sprague",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Keltin Moulton",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "20",
        "name": "Brayden Johnson",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "21",
        "name": "Preston Berko",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Carter Freeman",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "33",
        "name": "Kason Perkins",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Adam Thurston",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Profile",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Cohen Brantley",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Braden Gignac",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Tanner Schmarr",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Miles Constantine",
        "class": "FR",
        "position": "C"
      },
      {
        "number": "11",
        "name": "Trent Laleme",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Trey Laleme",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Carter Clough",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Ethan Ferguson",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Bryce DiMarzio",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Daryion Faustin",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Sully Sykes",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "30",
        "name": "Baylor Harold",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "31",
        "name": "Cody Reslow",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "34",
        "name": "Lincoln Guay",
        "class": "FR",
        "position": "G"
      }
    ],
    "head_coach": "Tim Clough",
    "assistant_coaches": "",
    "managers": "Henry Hamilton"
  },
  {
    "school": "Portsmouth Christian",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Sarafina Anella",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Zuri Petlick",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Isabella Stevens",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Olivia Boissonneault",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Ava Buchanan",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Emma Anderson",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "11",
        "name": "Sophie Anderson",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "12",
        "name": "Hattie Tuttle",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "13",
        "name": "Tilly Arico",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "15",
        "name": "Olivia Olstad",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Julianna Poulin",
        "class": "FR",
        "position": "F"
      }
    ],
    "head_coach": "Katie Robertson",
    "assistant_coaches": "Scott Stevens",
    "managers": ""
  },
  {
    "school": "Hopkinton",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Greyson Leflem",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Levi Mailloux",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Edvard Lie Nauff",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "4",
        "name": "Kristof Cauley",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Ben Normand",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "10",
        "name": "Cooper Owens",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Nick Goddard",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "15",
        "name": "Kyle Buelte",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Jackson Westover",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "23",
        "name": "Tyler Gross",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "30",
        "name": "Nate Spofford",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "35",
        "name": "Devin Allen",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "51",
        "name": "Leon Luca",
        "class": "FR",
        "position": "F"
      }
    ],
    "head_coach": "Liam McNicholas",
    "assistant_coaches": "",
    "managers": "Jacob Lanman"
  },
  {
    "school": "Newmarket",
    "gender": "Boys",
    "players": [
      {
        "number": "2",
        "name": "Matt Napoletano",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Mark Vincent",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Anthony Jurkoic",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Jackie Prompradit",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Ben Braley",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Jacob Polzinetti",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Jefferson Folsom",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "20",
        "name": "Luke Noon",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Nick Minutelli",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Mason Belmore",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Cam Smith",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Cole Ahumuda",
        "class": "SO",
        "position": "F"
      }
    ],
    "head_coach": "Nick Farrer",
    "assistant_coaches": "",
    "managers": "Jake Westrate"
  },
  {
    "school": "Raymond",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Isabella Gott",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Kylie Carr",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Gianna Gott",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Claire Michalak",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Annette Darling",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "11",
        "name": "Sophie Huynh",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Avery Dean",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Katelyn Cooney",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "15",
        "name": "Mady Alfonso",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Jemma Berard",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Meadow-miah Mitchell",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "Tom Bourdeau",
    "assistant_coaches": "Shawn Messenger",
    "managers": ""
  },
  {
    "school": "Derryfield",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Juelrick Phanor",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Jake Larson",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Blake Moskov",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Nate Boudreau",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Obi Mousa",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Liam Cesar",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Logan O'Leary",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Liam Ryan",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Deepsun Adhikari",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Jon Martinez",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Mitch Labbe",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "30",
        "name": "Sammy Fazelat",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "34",
        "name": "Sam Krasnof",
        "class": "SO",
        "position": "C"
      }
    ],
    "head_coach": "Mitchell Roy",
    "assistant_coaches": "Dylan O'Brien",
    "managers": "Mouad Yzzogh"
  },
  {
    "school": "Lisbon",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Emily Chaote",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "3",
        "name": "Arya Kimball",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Lyla Berrios",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Autumn Himes",
        "class": "8th",
        "position": "G/F"
      },
      {
        "number": "11",
        "name": "Maddie Tattersall",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Amara Daniels",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Bailey Clark",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Summer Wehr",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Emma Daniels",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "25",
        "name": "Miaya Shannon",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "33",
        "name": "Jocelyn Santaw",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "40",
        "name": "Jicela Montano",
        "class": "SO",
        "position": "G"
      }
    ],
    "head_coach": "Harley Dubreuil",
    "assistant_coaches": "Valerie Himes",
    "managers": "Hannah Aldrich"
  },
  {
    "school": "White Mountains",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Victoria Hertel",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Ella Kate Payer",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Alyana Whipple",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Mackenzie Foss",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Harper Rowe",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Reese Dubois",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Laycee Ingerson",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Kaya Nkwen-Tamo",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Jena Kenison",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Addy Kenison",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "21",
        "name": "Olivia Lorenz",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Chris Foss",
    "assistant_coaches": "Aaryn Ford",
    "managers": "Maddy Rexford"
  },
  {
    "school": "Epping",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Harrison Hodgkins",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Jack Vigliotte",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Jaquari Chase",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Dominic Elwell",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Aidan MacLean",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Blake Snyder",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Kosta Maschas",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "14",
        "name": "Benjamin Follansbee",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Artemio Grigorjevs",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "20",
        "name": "Brett Hynds",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Lucas Mazzone",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Andrew Ayotte",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Andrew McNamara",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "25",
        "name": "Liam Galvin",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "34",
        "name": "Dante Rutigliano",
        "class": "SO",
        "position": "G"
      }
    ],
    "head_coach": "Chris Goldsack",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Franklin",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Tucker Pope",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Nathan Holmes",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Joseph Dougherty",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Corbin Wyatt",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Cody Williams",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "10",
        "name": "Holden Douville",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Kye Charbono",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "15",
        "name": "Thomas Nason",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "20",
        "name": "Matthew Carlsen",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Colin Shaw",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "24",
        "name": "Darren Holmes",
        "class": "FR",
        "position": "C"
      },
      {
        "number": "32",
        "name": "Mark Slocum",
        "class": "FR",
        "position": "F/C"
      },
      {
        "number": "33",
        "name": "Bryce Thurber",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Dylan Rowen",
    "assistant_coaches": "Zach Douville",
    "managers": "Tbd"
  },
  {
    "school": "Epping",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Lyla Shumway",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Isabella Gagnon",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Harper Hodgkins",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Mya Tweedie",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Kendra Grinnell",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Mackenzie Pettis",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Liliana Bilodeau",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Kalila Fox",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Kalina Charkowski",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Sirena Suazo",
        "class": "FR",
        "position": "F"
      }
    ],
    "head_coach": "Larry Casale",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Newmarket",
    "gender": "Girls",
    "players": [
      {
        "number": "0",
        "name": "Kiara Rugora",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "3",
        "name": "Carrigan O'Connell",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Lydia Edgerly",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Hannah Chesley",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "14",
        "name": "Kaya Dobberstein",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "15",
        "name": "AJ Mulligan",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Amaya Beckles",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Rhiannon Lewis",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Emma Fortin",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "Randy Edgerly",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Mascenic",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Fiona Alix",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Brielle Bergeron",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Hailey Saari",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Brooke Bishop",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "11",
        "name": "Sienna Gregory",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "12",
        "name": "Avery Cormier",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Bri McCabe",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "20",
        "name": "Hannah Cargill",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "21",
        "name": "Jenna Knisley",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "23",
        "name": "Jordin Schuler",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Saige Stacy",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Tony Zina",
    "assistant_coaches": "Shelby Babin, Justin Cormier",
    "managers": "Maya Olivera"
  },
  {
    "school": "Mount Royal",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Lucy Treece",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "2",
        "name": "Angela Moorehouse",
        "class": "8th",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Jubilee Tremblay",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Caoilainn Haefner",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Eliana Haefner",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Maria Fraioli",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "12",
        "name": "Emma LaMothe",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Jaylin Greenhalgh",
        "class": "8th",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Arianna Merritt",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Lilianna Chimienti",
        "class": "8th",
        "position": "F"
      }
    ],
    "head_coach": "Derek Tremblay",
    "assistant_coaches": "Bonnie Treece, Jacinta Hogan",
    "managers": ""
  },
  {
    "school": "Hopkinton",
    "gender": "Girls",
    "players": [
      {
        "number": "3",
        "name": "Gemma Guadagno",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Paige Boudette",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Ella-Mai Johnson",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Avery Chase",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Zoe Bishop",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Caroline Chehade",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "21",
        "name": "Helen Yeaton",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Madi Belanger",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Elli Gregory",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "25",
        "name": "Lexi Korbet",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "32",
        "name": "Nora Collins",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "33",
        "name": "Ellie Collins",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "35",
        "name": "Isabella Correa",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "Mike Mahoney",
    "assistant_coaches": "Skate Murdough, Miah Boucher",
    "managers": "Kinley St. Cyr"
  },
  {
    "school": "Fall Mountain",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Jenna Fillion",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Kelsey Fillion",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "McKailah Russell",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "5",
        "name": "Adella Ashworth",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Riley Beckwith",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "13",
        "name": "Stella Grillone",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "14",
        "name": "Lydia Vogel",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Abby Jarvis",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "20",
        "name": "Emma King",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Violet Colburn",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "22",
        "name": "Sophia Grillone",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Aubrey Thomas",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "25",
        "name": "Siera King",
        "class": "SR",
        "position": "F"
      }
    ],
    "head_coach": "Matt Baird-Torney",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Belmont",
    "gender": "Boys",
    "players": [
      {
        "number": "0",
        "name": "Spenser Cate",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "1",
        "name": "Wyatt Carroll",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Owen Viar",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Jack Binder",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Niko Smith",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Evan Martinez",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "10",
        "name": "Brayden Townsend",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Brody Ennis",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "13",
        "name": "Gino Montalto",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Wyatt Divers",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Brady Fysh",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Cam Lemay",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "40",
        "name": "Kyle Bryant",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "50",
        "name": "Wyatt Bamford",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Tony Martinez",
    "assistant_coaches": "Scott Ennis, Greg DeSchuiteneer",
    "managers": "Avery Thurber, Paige Dillon"
  },
  {
    "school": "Wilton-Lyndeborough",
    "gender": "Girls",
    "players": [
      {
        "number": "3",
        "name": "Bella Boettcher",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Cailin Swett",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "5",
        "name": "Ava White",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Leah Crawley",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Maddy Labrecque",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Myah Montmarquet",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Brooke Hadley",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "McKenna Crouse",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Ayva Morgan",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Dani Stratton",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Tom Crowley",
    "assistant_coaches": "Duncan Rae",
    "managers": ""
  },
  {
    "school": "Pittsburg-Canaan",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Raeleigh Oppelt",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Cora Daley",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Aliyah Drew",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Rylee Phillips",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "10",
        "name": "Shelby Godin",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "11",
        "name": "Ayva Cunningham",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Raygen Couch",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Ella Gilbert",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Jaylyn Young",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Alyvia Jaimes",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "20",
        "name": "Sienna Grondin",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Laylynn Sierad",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "30",
        "name": "Payton Perigny",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "32",
        "name": "Rylie Lynch",
        "class": "SO",
        "position": "F"
      }
    ],
    "head_coach": "Matthew Jordan",
    "assistant_coaches": "Natalie Purrington",
    "managers": "Allison Avery, Liah Thibault, Reagan Thibault"
  },
  {
    "school": "Hinsdale",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Chris Colon",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Eli Colon",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Connor Dixon",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Caden Steever-Kilelee",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Jack Clark",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Hunter Taylor",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Aarav Patel",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Trevor Corey",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Grady Jutras",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "41",
        "name": "Colton Bornkessel",
        "class": "SO",
        "position": "F"
      }
    ],
    "head_coach": "Carl Anderson",
    "assistant_coaches": "Danny O'Melia",
    "managers": ""
  },
  {
    "school": "Woodsville",
    "gender": "Girls",
    "players": [
      {
        "number": "2",
        "name": "Kaidyn Cox",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Kiarra Simpson",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Eyrleigh Hambrick",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Makayla Walker",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Jill Roy",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Katie Houston",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Joslin Williams",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Morgan Crocker",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "35",
        "name": "Ellie Martin",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "44",
        "name": "Rylynn Hambrick",
        "class": "FR",
        "position": "G"
      }
    ],
    "head_coach": "Jamie Walker",
    "assistant_coaches": "Steve Colby",
    "managers": ""
  },
  {
    "school": "Trinity",
    "gender": "Girls",
    "players": [
      {
        "number": "0",
        "name": "Nayeli Perez",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "1",
        "name": "Sadie Mungere",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Isabella Soule",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Jodi Erilla",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Sophia Houde",
        "class": "SO",
        "position": "F/C"
      },
      {
        "number": "5",
        "name": "Lily Ferdinando",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Janiyah Lofton",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Addison Moynihan",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Sophia Gonzalez",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Jade Mosher",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Summer Cullen",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Lillian Manning",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Cameron Owen",
    "assistant_coaches": "Ashley Giampetruzzi, Amy Towler",
    "managers": ""
  },
  {
    "school": "Sanborn",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Gabby St. Cyr",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Alyssa Boutin",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "3",
        "name": "Sage Jackson",
        "class": "SO",
        "position": "F/C"
      },
      {
        "number": "4",
        "name": "Samantha Brown",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Ellie Rankin",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Makenzie White",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Elizabeth Bristol",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Kaylee Fortin",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Cassie Ahern",
        "class": "FR",
        "position": "G/F"
      },
      {
        "number": "21",
        "name": "Madelyn Rockwell",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "23",
        "name": "Makenna Murphy",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Gwen LaValley",
        "class": "FR",
        "position": "G/F"
      }
    ],
    "head_coach": "Samantha Broyer",
    "assistant_coaches": "Madison Lovely",
    "managers": ""
  },
  {
    "school": "Exeter",
    "gender": "Boys",
    "players": [
      {
        "number": "2",
        "name": "Tyler Ream",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Raymond Plante",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Agee Griffith",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Johnny Gillis",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Jackson McDonald",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Michael Burke",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Thomas Graves",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Nicholas Meyers",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Cooper Pettigrove",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "21",
        "name": "Nathan Tomasi",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Ben Smith",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Jack Thibodeau",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "24",
        "name": "Lucas Cromer",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "34",
        "name": "Huxley Brown",
        "class": "SR",
        "position": "F"
      }
    ],
    "head_coach": "Jeffrey Holmes",
    "assistant_coaches": "Tom Caduiex, Chris Passmore, David Hyvari",
    "managers": ""
  },
  {
    "school": "Souhegan",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Julia Skelton",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Mariellah Dart",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Lanai Hickman",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Abby Mayo",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Brynn Siska",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Ella Duclos",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Sophie Cullen",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Zofia Rosenfield",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Natalie Bryan",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "30",
        "name": "Nayaa Dineshkumar",
        "class": "FR",
        "position": "F"
      }
    ],
    "head_coach": "Greg Cotreau",
    "assistant_coaches": "Candace Craig, Bonnie Sinclair",
    "managers": "Grace Clark, Alanah Dutremble"
  },
  {
    "school": "Bishop Brady",
    "gender": "Boys",
    "players": [
      {
        "number": "2",
        "name": "Daniel Shedd",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "James Horangic",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "4",
        "name": "Alex Pelletier",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Jake Blanchette",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Koltan Gaudreault",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Dylan DuBreuil",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Josh Jabo",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Nicholas Hayes",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Jonathan Lazear",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Mason Noel",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "22",
        "name": "Billy Mullen",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Ryan Casey",
        "class": "SR",
        "position": "F/C"
      }
    ],
    "head_coach": "Bill Duffy",
    "assistant_coaches": "Josh LeClaire",
    "managers": ""
  },
  {
    "school": "Pittsburg-Canaan",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Carter Umlah",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Aiden Gray",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Daemon Jaimes",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Gio Luciano",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Devin Phillips",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Christian DeGray",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Austin Owen",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Carson Cross",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Brayden Woodburn",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Bryce Laro",
        "class": "8th",
        "position": "F/C"
      },
      {
        "number": "21",
        "name": "Darren Clogston",
        "class": "FR",
        "position": "F/C"
      },
      {
        "number": "32",
        "name": "Jordan Harding",
        "class": "SO",
        "position": "F/C"
      }
    ],
    "head_coach": "Cody Richards",
    "assistant_coaches": "Nate Jenkins-Goetz",
    "managers": ""
  },
  {
    "school": "Bow",
    "gender": "Boys",
    "players": [
      {
        "number": "2",
        "name": "Jacob Littlefield",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Giancarlo DiBlasio",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Lochlann Brady",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Ben Reardon",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Brendan O'Keeffe",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Carter Hall",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Kyle Cimis",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Conor Curtis",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "21",
        "name": "Peyton Larrabee",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Conor Eno",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Anthony Albushies",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "30",
        "name": "Jacob Filkins",
        "class": "SO",
        "position": "G"
      }
    ],
    "head_coach": "Eric Saucier",
    "assistant_coaches": "Trevor Moore",
    "managers": ""
  },
  {
    "school": "Lin-Wood",
    "gender": "Girls",
    "players": [
      {
        "number": "2",
        "name": "Briar Clark",
        "class": "",
        "position": ""
      },
      {
        "number": "3",
        "name": "Kiara Khosla",
        "class": "",
        "position": ""
      },
      {
        "number": "4",
        "name": "Isabella Powers",
        "class": "",
        "position": ""
      },
      {
        "number": "5",
        "name": "Caroline Hiltz",
        "class": "",
        "position": ""
      },
      {
        "number": "10",
        "name": "Maisie Anderson",
        "class": "",
        "position": ""
      },
      {
        "number": "11",
        "name": "Stella Brophy",
        "class": "",
        "position": ""
      },
      {
        "number": "25",
        "name": "Crystal Harris",
        "class": "",
        "position": ""
      },
      {
        "number": "33",
        "name": "Zoe Conn",
        "class": "",
        "position": ""
      }
    ],
    "head_coach": "Courtney Peabody",
    "assistant_coaches": "Jess Halm",
    "managers": ""
  },
  {
    "school": "Lin-Wood",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Spencer Arpin",
        "class": "",
        "position": ""
      },
      {
        "number": "2",
        "name": "Chuck Poitras",
        "class": "",
        "position": ""
      },
      {
        "number": "3",
        "name": "Camden Anderson",
        "class": "",
        "position": ""
      },
      {
        "number": "4",
        "name": "Ollie Bujeaud",
        "class": "",
        "position": ""
      },
      {
        "number": "5",
        "name": "Brodie Murray",
        "class": "",
        "position": ""
      },
      {
        "number": "11",
        "name": "Kyle Weeden",
        "class": "",
        "position": ""
      },
      {
        "number": "12",
        "name": "Tyler Johansen",
        "class": "",
        "position": ""
      },
      {
        "number": "14",
        "name": "Ian Anderson",
        "class": "",
        "position": ""
      },
      {
        "number": "24",
        "name": "Evan Bujeaud",
        "class": "",
        "position": ""
      }
    ],
    "head_coach": "Max LeBlanc",
    "assistant_coaches": "Vance Pickering, Stuart Anderson",
    "managers": ""
  },
  {
    "school": "Inter-Lakes",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Brooke Taylor",
        "class": "SR",
        "position": ""
      },
      {
        "number": "2",
        "name": "Bella Kimball",
        "class": "JR",
        "position": ""
      },
      {
        "number": "4",
        "name": "Emily Doda",
        "class": "SR",
        "position": ""
      },
      {
        "number": "5",
        "name": "Aubrey Bresse",
        "class": "SO",
        "position": ""
      },
      {
        "number": "10",
        "name": "Kate Taylor",
        "class": "SO",
        "position": ""
      },
      {
        "number": "11",
        "name": "Riley Anderson",
        "class": "SR",
        "position": ""
      },
      {
        "number": "13",
        "name": "Esther Nunez",
        "class": "JR",
        "position": ""
      },
      {
        "number": "15",
        "name": "Soriya Richards",
        "class": "JR",
        "position": ""
      },
      {
        "number": "22",
        "name": "Grace Stephens",
        "class": "JR",
        "position": ""
      },
      {
        "number": "23",
        "name": "Tessa Mutney",
        "class": "JR",
        "position": ""
      }
    ],
    "head_coach": "Pierre Doda",
    "assistant_coaches": "Mark Anderson",
    "managers": ""
  },
  {
    "school": "Raymond",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Logan Woods",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Lukas Larrabee",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Tyler Brooks",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Jackson Waterhouse",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "10",
        "name": "Jackson Wall",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Troy Carpenter",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Michael Chirichiello",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Maddox Brown",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "21",
        "name": "Magnus Lord",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Ronnie Cordwell",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Jacobi Cumberbatch",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "25",
        "name": "Jack Jewett",
        "class": "JR",
        "position": "C"
      }
    ],
    "head_coach": "Jim Gallagher",
    "assistant_coaches": "Jay Labranche, Julien Duffaut, Jon Waterhouse",
    "managers": ""
  },
  {
    "school": "Coe-Brown",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Grant Hayes",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Rorik Collins",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Grady Mulligan",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Quinlen Purington",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Nick Cimino",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Oliver Ford",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Tim Kerivan",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Myles Brackett",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Abel Szatko",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Garrett Ward",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Colby Taylor",
        "class": "JR",
        "position": "C"
      },
      {
        "number": "25",
        "name": "Istvan Miko",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "33",
        "name": "Carson Fowler",
        "class": "SR",
        "position": "F"
      }
    ],
    "head_coach": "David S. Smith",
    "assistant_coaches": "William Clarke, Kyle Purington II",
    "managers": ""
  },
  {
    "school": "Hanover",
    "gender": "Boys",
    "players": [
      {
        "number": "3",
        "name": "Cooper Sobel",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Denis Pletnev",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Hayden Avard",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "10",
        "name": "Keller Greene",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Roy Lucas",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Allie Muirhead",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Ryan O'Hern",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Ira Clifford",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "20",
        "name": "Jack Lobb",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "21",
        "name": "Samuel Bagatell",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "22",
        "name": "Colin McLaughlin",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Benson Friede",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "25",
        "name": "EJ Frechette",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "30",
        "name": "Wyatt Daigle",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "35",
        "name": "Andrew Cramer",
        "class": "SR",
        "position": "F/C"
      }
    ],
    "head_coach": "Denver Greene",
    "assistant_coaches": "Tamir Campbell, Mike Padmore II",
    "managers": "Matthew Lepene"
  },
  {
    "school": "Goffstown",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Jenna Shannon",
        "class": "JR",
        "position": ""
      },
      {
        "number": "2",
        "name": "Gabby Millas",
        "class": "SR",
        "position": ""
      },
      {
        "number": "3",
        "name": "Taylor Johnson",
        "class": "JR",
        "position": ""
      },
      {
        "number": "4",
        "name": "Mia Brissette",
        "class": "SR",
        "position": ""
      },
      {
        "number": "5",
        "name": "Joslyn Coughlin",
        "class": "FR",
        "position": ""
      },
      {
        "number": "10",
        "name": "Madi Giordano",
        "class": "SR",
        "position": ""
      },
      {
        "number": "11",
        "name": "Sophie MacDonald",
        "class": "SO",
        "position": ""
      },
      {
        "number": "12",
        "name": "Reilly Cox",
        "class": "SO",
        "position": ""
      },
      {
        "number": "13",
        "name": "Reece Still",
        "class": "JR",
        "position": ""
      },
      {
        "number": "14",
        "name": "Addyson Glejzer",
        "class": "JR",
        "position": ""
      },
      {
        "number": "20",
        "name": "Jocelyn O'Meara",
        "class": "SR",
        "position": ""
      },
      {
        "number": "22",
        "name": "Katherine Jones",
        "class": "SR",
        "position": ""
      },
      {
        "number": "23",
        "name": "Alexia Haines",
        "class": "FR",
        "position": ""
      }
    ],
    "head_coach": "Nate Bracy",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Oyster River",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Hayden MacNeil",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Gwen Dulac",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Ashling Ferris",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Jazzy Alvarez",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Wren Horne",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Eva Bebbington",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Payton Drapeau",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "12",
        "name": "Grace Schulten-Neiweem",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "13",
        "name": "Avery Biggwither",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Kendall Strong",
        "class": "SR",
        "position": "C"
      },
      {
        "number": "23",
        "name": "Lucy Gialousis",
        "class": "SO",
        "position": "C"
      }
    ],
    "head_coach": "Bryan Wall",
    "assistant_coaches": "",
    "managers": ""
  },
  {
    "school": "Manchester Memorial",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Joel Gomez",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Aging Aging",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "3",
        "name": "Dylan Jolicoeur",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Talon Gregory-Alleyne",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Donald Bory",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Ewa Edokpolo",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Moses White",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "13",
        "name": "Joseph Jackson",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "14",
        "name": "Michael Georges",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Ledum Adumene",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Jake Ornelas",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "22",
        "name": "Derek Jones",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Eldan Taric",
        "class": "SO",
        "position": "F/C"
      },
      {
        "number": "24",
        "name": "Brady Sacco",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "25",
        "name": "Kench Emadamerho",
        "class": "FR",
        "position": "G"
      }
    ],
    "head_coach": "Danny Bryson",
    "assistant_coaches": "Tyson Thomas, Andrew Smith",
    "managers": ""
  },
  {
    "school": "Keene",
    "gender": "Boys",
    "players": [
      {
        "number": "0",
        "name": "Dan Malay",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "2",
        "name": "Ty Stanley",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Kasen Abbott",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Jamal Stanley",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "5",
        "name": "Ryker Washburn",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "10",
        "name": "Songwei Chen",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Gus Smith",
        "class": "SR",
        "position": "F/C"
      },
      {
        "number": "22",
        "name": "Griffyn Smith",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "23",
        "name": "Alex Holmes",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "24",
        "name": "Brayden French",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "33",
        "name": "Rhys Fontaine",
        "class": "JR",
        "position": "F/C"
      }
    ],
    "head_coach": "Ray Boulay",
    "assistant_coaches": "Rob Farnsworth, Jake Kidney, Andrew Colbert I",
    "managers": "Aiden Hodgman"
  },
  {
    "school": "Alvirne",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Alex Bettencourt",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Luke Norse",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Sean Chipfunde",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Amri Ofori",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Angel Kangar",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Garrett Hall",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Gavin Baviello",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Cam St. Clair",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Carsen Mills",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "14",
        "name": "Jacoby Durham",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "15",
        "name": "Adam Wibowo",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "23",
        "name": "Patrick Deely",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "Sam Bonney-Liles",
    "assistant_coaches": "John Fisher, Cam Kruger, Buddy O'Hearn",
    "managers": ""
  },
  {
    "school": "Portsmouth Christian",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Truman Smith",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "2",
        "name": "Josiah Ludwig",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "3",
        "name": "Isaac Conant",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Ezra Chamberlain",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "5",
        "name": "Lorden Trayer",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Jackson Malone",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Josh Gerwig",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Logan Summers",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Hoaming Zhu",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "24",
        "name": "Zech Beal",
        "class": "SO",
        "position": "C"
      },
      {
        "number": "30",
        "name": "Zealand Marquis",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "32",
        "name": "Cai Summers",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "33",
        "name": "Noah Hasty",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "Derek Summers",
    "assistant_coaches": "Brian Marquis, Shaun Bradley, Mike Catapano IV",
    "managers": "Sam Monahan"
  },
  {
    "school": "Bishop Brady",
    "gender": "Girls",
    "players": [
      {
        "number": "1",
        "name": "Bella Flattery",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Maia Dow",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "4",
        "name": "Emily Gaby",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "5",
        "name": "Ella Blanchette",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "10",
        "name": "Juliette McLaughlin",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "11",
        "name": "Kenzie Packer",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Caitlin Michaud",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Vuye Nare",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Hailey Whitehouse",
        "class": "SO",
        "position": "G/F"
      }
    ],
    "head_coach": "Dana Young",
    "assistant_coaches": "Marianne Thebodeau II",
    "managers": "Mari Shedd"
  },
  {
    "school": "Pittsfield",
    "gender": "Boys",
    "players": [
      {
        "number": "0",
        "name": "Mason Weldon",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "1",
        "name": "Braiden Elliott",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Owen Clark",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Sawyer Morse",
        "class": "7th",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Gavin Martin",
        "class": "SO",
        "position": "F"
      },
      {
        "number": "21",
        "name": "Ben Anderson",
        "class": "FR",
        "position": "F"
      },
      {
        "number": "23",
        "name": "Micha Dodds",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Jon Lee",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "32",
        "name": "Chayce Presby",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "33",
        "name": "Riley Lavigne",
        "class": "8th",
        "position": "F"
      }
    ],
    "head_coach": "Jay Darrah",
    "assistant_coaches": "Cam Darrah, Dan Chagnon IV",
    "managers": ""
  },
  {
    "school": "Bedford",
    "gender": "Girls",
    "players": [
      {
        "number": "2",
        "name": "Maddie Lacroix",
        "class": "FR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Annie Zink",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "4",
        "name": "Grace Wolf",
        "class": "SR",
        "position": "G/F"
      },
      {
        "number": "5",
        "name": "Sarah Muir",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "11",
        "name": "Mia Katane",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "12",
        "name": "Eva Zink",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "14",
        "name": "Adra Casey",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "15",
        "name": "Juliet Laws",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "20",
        "name": "Clare White",
        "class": "JR",
        "position": "G"
      },
      {
        "number": "22",
        "name": "Mel Gibson",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "24",
        "name": "Mel McCarthy",
        "class": "SR",
        "position": "F"
      },
      {
        "number": "30",
        "name": "Bella Landies",
        "class": "JR",
        "position": "F"
      }
    ],
    "head_coach": "Kevin Gibbs",
    "assistant_coaches": "Jordan Grant, Megan McIver, Greg Uliasz I",
    "managers": "Ella Allard"
  },
  {
    "school": "Lisbon",
    "gender": "Boys",
    "players": [
      {
        "number": "1",
        "name": "Hunter Berrios",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "2",
        "name": "Jake Houghton",
        "class": "SR",
        "position": "G"
      },
      {
        "number": "3",
        "name": "Tyler Leno",
        "class": "JR",
        "position": "G/F"
      },
      {
        "number": "4",
        "name": "Sawyer Fenoff",
        "class": "SO",
        "position": "F/C"
      },
      {
        "number": "10",
        "name": "Lucas French",
        "class": "JR",
        "position": "F/C"
      },
      {
        "number": "11",
        "name": "Tucker Holbrook",
        "class": "SO",
        "position": "G"
      },
      {
        "number": "13",
        "name": "Gunner Burt",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "15",
        "name": "Dawson Himes",
        "class": "SR",
        "position": "C/F"
      },
      {
        "number": "22",
        "name": "Landen Daniels",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "25",
        "name": "Jayden Hesseltine",
        "class": "SO",
        "position": "G/F"
      },
      {
        "number": "33",
        "name": "Evan Becker",
        "class": "JR",
        "position": "F"
      },
      {
        "number": "55",
        "name": "Noah Lauzon",
        "class": "SR",
        "position": "C"
      }
    ],
    "head_coach": "",
    "assistant_coaches": "",
    "managers": ""
  }
]
;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

export async function handler(event, context) {
  // Safety check - require confirmation parameter
  const params = event.queryStringParameters || {};
  if (params.confirm !== 'yes') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Add ?confirm=yes to URL to run the import',
        count: ROSTERS_TO_IMPORT.length
      })
    };
  }

  const results = {
    success: 0,
    failed: 0,
    imported: [],
    errors: []
  };

  for (const roster of ROSTERS_TO_IMPORT) {
    const submission = {
      school: roster.school,
      gender: roster.gender,
      division: null,
      submitted_by: 'Legacy Import',
      submitted_email: null,
      submission_type: 'import',
      head_coach: roster.head_coach || null,
      assistant_coaches: roster.assistant_coaches || null,
      managers: roster.managers || null,
      pdf_url: null,
      status: 'approved',
      players_json: roster.players || [],
      notes: 'Imported from rosters_data.js',
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'System'
    };

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/roster_submissions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(submission)
        }
      );

      if (response.ok) {
        results.success++;
        results.imported.push(`${roster.school} ${roster.gender}`);
      } else {
        results.failed++;
        results.errors.push(`${roster.school} ${roster.gender}: ${await response.text()}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push(`${roster.school} ${roster.gender}: ${err.message}`);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Import complete',
      results
    })
  };
}
