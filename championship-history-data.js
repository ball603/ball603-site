/**
 * NHIAA Basketball Championship History
 * Parsed from official NHIAA records
 * Data ready for Supabase import
 */

const CHAMPIONSHIP_HISTORY = {
  // ===== BOYS BASKETBALL =====
  boys: [
    // Division I / Class L (Large Schools)
    { year: 2025, division: 'Division I', champion: 'Bedford', champion_score: 51, runner_up: 'Keene', runner_up_score: 50 },
    { year: 2024, division: 'Division I', champion: 'Pinkerton', champion_score: 90, runner_up: 'Nashua North', runner_up_score: 76 },
    { year: 2023, division: 'Division I', champion: 'Bedford', champion_score: 66, runner_up: 'Pinkerton', runner_up_score: 56 },
    { year: 2022, division: 'Division I', champion: 'Trinity', champion_score: 64, runner_up: 'Goffstown', runner_up_score: 62 },
    { year: 2021, division: 'Division I', champion: 'Bishop Guertin', champion_score: 42, runner_up: 'Winnacunnet', runner_up_score: 35 },
    { year: 2020, division: 'Division I', champion: 'Exeter', runner_up: 'Portsmouth', notes: 'Co-Champions (COVID-19)' },
    { year: 2019, division: 'Division I', champion: 'Exeter', champion_score: 53, runner_up: 'Salem', runner_up_score: 30 },
    { year: 2018, division: 'Division I', champion: 'Portsmouth', champion_score: 46, runner_up: 'Dover', runner_up_score: 38 },
    { year: 2017, division: 'Division I', champion: 'Portsmouth', champion_score: 63, runner_up: 'Bedford', runner_up_score: 40 },
    { year: 2016, division: 'Division I', champion: 'Manchester Central', champion_score: 60, runner_up: 'Merrimack', runner_up_score: 58 },
    { year: 2015, division: 'Division I', champion: 'Londonderry', champion_score: 47, runner_up: 'Pinkerton', runner_up_score: 46 },
    { year: 2014, division: 'Division I', champion: 'Manchester Central', champion_score: 70, runner_up: 'Merrimack', runner_up_score: 61 },
    { year: 2013, division: 'Division I', champion: 'Trinity', champion_score: 50, runner_up: 'Bishop Guertin', runner_up_score: 46 },
    { year: 2012, division: 'Division I', champion: 'Merrimack', champion_score: 65, runner_up: 'Manchester Central', runner_up_score: 56 },
    { year: 2011, division: 'Division I', champion: 'Bishop Guertin', champion_score: 54, runner_up: 'Trinity', runner_up_score: 46 },
    { year: 2010, division: 'Class L', champion: 'Pinkerton', champion_score: 61, runner_up: 'Winnacunnet', runner_up_score: 59, overtime: true },
    { year: 2009, division: 'Class L', champion: 'Trinity', champion_score: 50, runner_up: 'Memorial', runner_up_score: 25 },
    { year: 2008, division: 'Class L', champion: 'Salem', champion_score: 66, runner_up: 'Trinity', runner_up_score: 45 },
    { year: 2007, division: 'Class L', champion: 'Salem', champion_score: 54, runner_up: 'Trinity', runner_up_score: 51 },
    { year: 2006, division: 'Class L', champion: 'Manchester Central', champion_score: 54, runner_up: 'Merrimack', runner_up_score: 39 },
    { year: 2005, division: 'Class L', champion: 'Manchester Central', champion_score: 48, runner_up: 'Dover', runner_up_score: 43 },
    { year: 2004, division: 'Class L', champion: 'Merrimack', champion_score: 78, runner_up: 'Salem', runner_up_score: 70 },
    { year: 2003, division: 'Class L', champion: 'Merrimack', champion_score: 78, runner_up: 'Dover', runner_up_score: 53 },
    { year: 2002, division: 'Class L', champion: 'Nashua', champion_score: 75, runner_up: 'Bishop Guertin', runner_up_score: 55 },
    { year: 2001, division: 'Class L', champion: 'Manchester Central', champion_score: 51, runner_up: 'Alvirne', runner_up_score: 48 },
    { year: 2000, division: 'Class L', champion: 'Manchester Central', champion_score: 81, runner_up: 'Winnacunnet', runner_up_score: 65 },
    { year: 1999, division: 'Class L', champion: 'Concord', champion_score: 67, runner_up: 'Manchester West', runner_up_score: 56 },
    { year: 1998, division: 'Class L', champion: 'Concord', champion_score: 73, runner_up: 'Exeter', runner_up_score: 44 },
    { year: 1997, division: 'Class L', champion: 'Concord', champion_score: 62, runner_up: 'Winnacunnet', runner_up_score: 56 },
    { year: 1996, division: 'Class L', champion: 'Manchester Central', champion_score: 66, runner_up: 'Winnacunnet', runner_up_score: 55 },
    { year: 1995, division: 'Class L', champion: 'Salem', champion_score: 62, runner_up: 'Winnacunnet', runner_up_score: 57 },
    { year: 1994, division: 'Class L', champion: 'Portsmouth', champion_score: 55, runner_up: 'Concord', runner_up_score: 49 },
    { year: 1993, division: 'Class L', champion: 'Manchester West', champion_score: 61, runner_up: 'Pinkerton', runner_up_score: 41 },
    { year: 1992, division: 'Class L', champion: 'Winnacunnet', champion_score: 48, runner_up: 'Keene', runner_up_score: 43 },
    { year: 1991, division: 'Class L', champion: 'Nashua', champion_score: 58, runner_up: 'Merrimack', runner_up_score: 48 },
    { year: 1990, division: 'Class L', champion: 'Pinkerton', champion_score: 62, runner_up: 'Manchester Central', runner_up_score: 54 },
    { year: 1989, division: 'Class L', champion: 'Manchester Central', champion_score: 59, runner_up: 'Pinkerton', runner_up_score: 52 },
    { year: 1988, division: 'Class L', champion: 'Pinkerton', champion_score: 59, runner_up: 'Manchester Central', runner_up_score: 56 },
    { year: 1987, division: 'Class L', champion: 'Concord', champion_score: 52, runner_up: 'Nashua', runner_up_score: 48 },
    { year: 1986, division: 'Class L', champion: 'Nashua', champion_score: 66, runner_up: 'Bishop Guertin', runner_up_score: 65 },
    { year: 1985, division: 'Class L', champion: 'Trinity', champion_score: 61, runner_up: 'Dover', runner_up_score: 58 },
    { year: 1984, division: 'Class L', champion: 'Portsmouth', champion_score: 59, runner_up: 'Bishop Guertin', runner_up_score: 46 },
    { year: 1983, division: 'Class L', champion: 'Bishop Guertin', champion_score: 56, runner_up: 'Nashua', runner_up_score: 50 },
    
    // Division II / Class I (Medium-Large Schools)
    { year: 2025, division: 'Division II', champion: 'Pembroke', champion_score: 63, runner_up: 'Sanborn', runner_up_score: 54 },
    { year: 2024, division: 'Division II', champion: 'Pelham', champion_score: 51, runner_up: 'Hanover', runner_up_score: 41 },
    { year: 2023, division: 'Division II', champion: 'Pelham', champion_score: 57, runner_up: 'Pembroke', runner_up_score: 54 },
    { year: 2022, division: 'Division II', champion: 'Souhegan', champion_score: 53, runner_up: 'ConVal', runner_up_score: 51 },
    { year: 2021, division: 'Division II', champion: 'Lebanon', champion_score: 40, runner_up: 'Pelham', runner_up_score: 33 },
    { year: 2020, division: 'Division II', champion: 'ConVal', runner_up: 'Bow', notes: 'Co-Champions (COVID-19)' },
    { year: 2019, division: 'Division II', champion: 'Pembroke', champion_score: 47, runner_up: 'Kearsarge', runner_up_score: 35 },
    { year: 2018, division: 'Division II', champion: 'Hollis-Brookline', champion_score: 56, runner_up: 'Oyster River', runner_up_score: 40 },
    { year: 2017, division: 'Division II', champion: 'Lebanon', champion_score: 59, runner_up: 'Coe-Brown', runner_up_score: 42 },
    { year: 2016, division: 'Division II', champion: 'Portsmouth', champion_score: 43, runner_up: 'Lebanon', runner_up_score: 29 },
    { year: 2015, division: 'Division II', champion: 'Bishop Brady', champion_score: 58, runner_up: 'Portsmouth', runner_up_score: 56 },
    { year: 2014, division: 'Division II', champion: 'Pembroke', champion_score: 49, runner_up: 'Portsmouth', runner_up_score: 40 },
    { year: 2013, division: 'Division II', champion: 'Pembroke', champion_score: 49, runner_up: 'Souhegan', runner_up_score: 41 },
    { year: 2012, division: 'Division II', champion: 'Portsmouth', champion_score: 58, runner_up: 'Bedford', runner_up_score: 33 },
    { year: 2011, division: 'Division II', champion: 'Milford', champion_score: 48, runner_up: 'Portsmouth', runner_up_score: 42 },
    { year: 2010, division: 'Class I', champion: 'Milford', champion_score: 52, runner_up: 'Pembroke', runner_up_score: 46 },
    { year: 2009, division: 'Class I', champion: 'Portsmouth', champion_score: 61, runner_up: 'Pelham', runner_up_score: 48 },
    { year: 2008, division: 'Class I', champion: 'Monadnock', champion_score: 42, runner_up: 'Hanover', runner_up_score: 35 },
    { year: 2007, division: 'Class I', champion: 'Hanover', champion_score: 40, runner_up: 'Portsmouth', runner_up_score: 38 },
    
    // Division III / Class M (Medium Schools)
    { year: 2025, division: 'Division III', champion: 'Belmont', champion_score: 49, runner_up: 'Kearsarge', runner_up_score: 43 },
    { year: 2024, division: 'Division III', champion: 'St. Thomas', champion_score: 38, runner_up: 'Conant', runner_up_score: 34 },
    { year: 2023, division: 'Division III', champion: 'Gilford', champion_score: 69, runner_up: 'Mascoma', runner_up_score: 43 },
    { year: 2022, division: 'Division III', champion: 'Gilford', champion_score: 46, runner_up: 'Kearsarge', runner_up_score: 38 },
    { year: 2021, division: 'Division III', champion: 'Gilford', champion_score: 41, runner_up: 'Hopkinton', runner_up_score: 40 },
    { year: 2020, division: 'Division III', champion: 'Gilford', runner_up: 'Mascenic', notes: 'Declared at Semifinal Round' },
    { year: 2019, division: 'Division III', champion: 'Conant', champion_score: 61, runner_up: 'Somersworth', runner_up_score: 38 },
    { year: 2018, division: 'Division III', champion: 'Somersworth', champion_score: 53, runner_up: 'Campbell', runner_up_score: 38 },
    { year: 2017, division: 'Division III', champion: 'Kearsarge', champion_score: 51, runner_up: 'Stevens', runner_up_score: 46 },
    { year: 2016, division: 'Division III', champion: 'Pelham', champion_score: 43, runner_up: 'Kearsarge', runner_up_score: 39 },
    { year: 2015, division: 'Division III', champion: 'Pelham', champion_score: 51, runner_up: 'Conant', runner_up_score: 42 },
    { year: 2014, division: 'Division III', champion: 'Conant', champion_score: 40, runner_up: 'Campbell', runner_up_score: 36 },
    { year: 2013, division: 'Division III', champion: 'Conant', champion_score: 66, runner_up: 'Campbell', runner_up_score: 46 },
    { year: 2012, division: 'Division III', champion: 'Berlin', champion_score: 53, runner_up: 'Prospect Mountain', runner_up_score: 51 },
    { year: 2011, division: 'Division III', champion: 'Somersworth', champion_score: 45, runner_up: 'Bow', runner_up_score: 39 },
    { year: 2010, division: 'Class M', champion: 'Conant', champion_score: 41, runner_up: 'Berlin', runner_up_score: 35 },
    { year: 2009, division: 'Class M', champion: 'Conant', champion_score: 43, runner_up: 'Prospect Mountain', runner_up_score: 33 },
    { year: 2008, division: 'Class M', champion: 'Conant', champion_score: 55, runner_up: 'Newmarket', runner_up_score: 48, overtime: true },
    { year: 2007, division: 'Class M', champion: 'Conant', champion_score: 53, runner_up: 'Gilford', runner_up_score: 49 },
    { year: 2006, division: 'Class M', champion: 'Conant', champion_score: 59, runner_up: 'Littleton', runner_up_score: 56 },
    { year: 2005, division: 'Class M', champion: 'Somersworth', champion_score: 55, runner_up: 'Conant', runner_up_score: 48 },
    { year: 1988, division: 'Class M', champion: 'Farmington', champion_score: 78, runner_up: 'Mascoma', runner_up_score: 70 },
    { year: 1984, division: 'Class M', champion: 'Farmington', champion_score: 76, runner_up: 'Conant', runner_up_score: 54 },
    { year: 1970, division: 'Class M', champion: 'Farmington', champion_score: 95, runner_up: 'Merrimack', runner_up_score: 83, overtime: true },
    
    // Division IV / Class S (Small Schools)
    { year: 2025, division: 'Division IV', champion: 'Woodsville', champion_score: 51, runner_up: 'Littleton', runner_up_score: 48 },
    { year: 2024, division: 'Division IV', champion: 'Profile', champion_score: 53, runner_up: 'Littleton', runner_up_score: 48 },
    { year: 2023, division: 'Division IV', champion: 'Woodsville', champion_score: 57, runner_up: 'Holy Family', runner_up_score: 49 },
    { year: 2022, division: 'Division IV', champion: 'Woodsville', champion_score: 58, runner_up: 'Concord Christian', runner_up_score: 49 },
    { year: 2021, division: 'Division IV', champion: 'Woodsville', champion_score: 52, runner_up: 'Portsmouth Christian', runner_up_score: 30 },
    { year: 2020, division: 'Division IV', champion: 'Littleton', runner_up: 'Newmarket', notes: 'Declared at Semifinal Round' },
    { year: 2019, division: 'Division IV', champion: 'Epping', champion_score: 72, runner_up: 'Littleton', runner_up_score: 61 },
    { year: 2018, division: 'Division IV', champion: 'Pittsfield', champion_score: 43, runner_up: 'Newmarket', runner_up_score: 40 },
    { year: 2017, division: 'Division IV', champion: 'Groveton', champion_score: 45, runner_up: 'Littleton', runner_up_score: 43 },
    { year: 2016, division: 'Division IV', champion: 'Littleton', champion_score: 38, runner_up: 'Portsmouth Christian', runner_up_score: 36 },
    { year: 2015, division: 'Division IV', champion: 'Wilton', champion_score: 50, runner_up: 'Epping', runner_up_score: 46 },
    { year: 2014, division: 'Division IV', champion: 'Epping', champion_score: 74, runner_up: 'Sunapee', runner_up_score: 70 },
    { year: 2013, division: 'Division IV', champion: 'Lisbon', champion_score: 38, runner_up: 'Derryfield', runner_up_score: 36 },
    { year: 2012, division: 'Division IV', champion: 'Moultonborough', champion_score: 54, runner_up: 'Littleton', runner_up_score: 50 },
    { year: 2011, division: 'Division IV', champion: 'Lisbon', champion_score: 40, runner_up: 'Derryfield', runner_up_score: 33 },
    { year: 2010, division: 'Class S', champion: 'Groveton', champion_score: 52, runner_up: 'Littleton', runner_up_score: 49 },
  ],

  // ===== GIRLS BASKETBALL =====
  girls: [
    // Division I / Class L
    { year: 2025, division: 'Division I', champion: 'Bedford', champion_score: 50, runner_up: 'Londonderry', runner_up_score: 44 },
    { year: 2024, division: 'Division I', champion: 'Bedford', champion_score: 60, runner_up: 'Pinkerton', runner_up_score: 41 },
    { year: 2023, division: 'Division I', champion: 'Bishop Guertin', champion_score: 51, runner_up: 'Bedford', runner_up_score: 45 },
    { year: 2022, division: 'Division I', champion: 'Bishop Guertin', champion_score: 48, runner_up: 'Bedford', runner_up_score: 46 },
    { year: 2021, division: 'Division I', champion: 'Bedford', champion_score: 64, runner_up: 'Bishop Guertin', runner_up_score: 46 },
    { year: 2020, division: 'Division I', champion: 'Bishop Guertin', runner_up: 'Goffstown', notes: 'Co-Champions (COVID-19)' },
    { year: 2019, division: 'Division I', champion: 'Bishop Guertin', champion_score: 46, runner_up: 'Portsmouth', runner_up_score: 33 },
    { year: 2018, division: 'Division I', champion: 'Bishop Guertin', champion_score: 54, runner_up: 'Pinkerton', runner_up_score: 34 },
    { year: 2017, division: 'Division I', champion: 'Bishop Guertin', champion_score: 52, runner_up: 'Bedford', runner_up_score: 49 },
    { year: 2016, division: 'Division I', champion: 'Bishop Guertin', champion_score: 35, runner_up: 'Bedford', runner_up_score: 31 },
    { year: 2015, division: 'Division I', champion: 'Londonderry', champion_score: 48, runner_up: 'Winnacunnet', runner_up_score: 33 },
    { year: 2014, division: 'Division I', champion: 'Londonderry', champion_score: 57, runner_up: 'Bedford', runner_up_score: 56 },
    { year: 2013, division: 'Division I', champion: 'Bedford', champion_score: 39, runner_up: 'Bishop Guertin', runner_up_score: 38 },
    { year: 2012, division: 'Division I', champion: 'Bishop Guertin', champion_score: 46, runner_up: 'Londonderry', runner_up_score: 43 },
    { year: 2011, division: 'Division I', champion: 'Winnacunnet', champion_score: 55, runner_up: 'Londonderry', runner_up_score: 46 },
    { year: 2010, division: 'Class L', champion: 'Winnacunnet', champion_score: 46, runner_up: 'Pinkerton', runner_up_score: 41 },
    { year: 2009, division: 'Class L', champion: 'Winnacunnet', champion_score: 53, runner_up: 'Trinity', runner_up_score: 41 },
    { year: 2008, division: 'Class L', champion: 'Winnacunnet', champion_score: 60, runner_up: 'Manchester Central', runner_up_score: 47 },
    { year: 2007, division: 'Class L', champion: 'Winnacunnet', champion_score: 48, runner_up: 'Bishop Guertin', runner_up_score: 39 },
    { year: 2006, division: 'Class L', champion: 'Pinkerton', champion_score: 42, runner_up: 'Bishop Guertin', runner_up_score: 24 },
    { year: 2005, division: 'Class L', champion: 'Trinity', champion_score: 56, runner_up: 'Dover', runner_up_score: 48 },
    
    // Division II / Class I
    { year: 2025, division: 'Division II', champion: 'Milford', champion_score: 43, runner_up: 'Oyster River', runner_up_score: 36 },
    { year: 2024, division: 'Division II', champion: 'Concord Christian', champion_score: 65, runner_up: 'Pembroke', runner_up_score: 53 },
    { year: 2023, division: 'Division II', champion: 'Kennett', champion_score: 38, runner_up: 'Bow', runner_up_score: 37 },
    { year: 2022, division: 'Division II', champion: 'Hanover', champion_score: 55, runner_up: 'Bow', runner_up_score: 24 },
    { year: 2021, division: 'Division II', champion: 'Bishop Brady', champion_score: 52, runner_up: 'Kennett', runner_up_score: 50 },
    { year: 2020, division: 'Division II', champion: 'Lebanon', runner_up: 'Spaulding', notes: 'Declared at Semifinal Round' },
    { year: 2019, division: 'Division II', champion: 'Hanover', champion_score: 52, runner_up: 'Kennett', runner_up_score: 41 },
    { year: 2018, division: 'Division II', champion: 'Hollis-Brookline', champion_score: 54, runner_up: 'John Stark', runner_up_score: 43 },
    { year: 2017, division: 'Division II', champion: 'Lebanon', champion_score: 44, runner_up: 'Hollis-Brookline', runner_up_score: 35 },
    { year: 2016, division: 'Division II', champion: 'Goffstown', champion_score: 37, runner_up: 'Hanover', runner_up_score: 31 },
    { year: 2015, division: 'Division II', champion: 'Coe-Brown', champion_score: 50, runner_up: 'Goffstown', runner_up_score: 46 },
    { year: 2014, division: 'Division II', champion: 'Merrimack Valley', champion_score: 55, runner_up: 'Coe-Brown', runner_up_score: 49 },
    { year: 2013, division: 'Division II', champion: 'Lebanon', champion_score: 48, runner_up: 'Portsmouth', runner_up_score: 41 },
    { year: 2012, division: 'Division II', champion: 'Souhegan', champion_score: 53, runner_up: 'Kearsarge', runner_up_score: 27 },
    { year: 2011, division: 'Division II', champion: 'Souhegan', champion_score: 47, runner_up: 'Lebanon', runner_up_score: 44 },
    { year: 2010, division: 'Class I', champion: 'Kennett', champion_score: 52, runner_up: 'Lebanon', runner_up_score: 45 },
    
    // Division III / Class M
    { year: 2025, division: 'Division III', champion: 'St. Thomas', champion_score: 72, runner_up: 'Fall Mountain', runner_up_score: 35 },
    { year: 2024, division: 'Division III', champion: 'Kearsarge', champion_score: 38, runner_up: 'Hopkinton', runner_up_score: 27 },
    { year: 2023, division: 'Division III', champion: 'Concord Christian', champion_score: 49, runner_up: 'Conant', runner_up_score: 35 },
    { year: 2022, division: 'Division III', champion: 'Monadnock', champion_score: 50, runner_up: 'Conant', runner_up_score: 31 },
    { year: 2021, division: 'Division III', champion: 'Conant', champion_score: 59, runner_up: 'Fall Mountain', runner_up_score: 43 },
    { year: 2020, division: 'Division III', champion: 'Conant', champion_score: 51, runner_up: 'Fall Mountain', runner_up_score: 42 },
    { year: 2019, division: 'Division III', champion: 'Monadnock', champion_score: 51, runner_up: 'Fall Mountain', runner_up_score: 44 },
    { year: 2018, division: 'Division III', champion: 'Conant', champion_score: 36, runner_up: 'Hopkinton', runner_up_score: 30 },
    { year: 2017, division: 'Division III', champion: 'Monadnock', champion_score: 44, runner_up: 'Conant', runner_up_score: 36 },
    { year: 2016, division: 'Division III', champion: 'Gilford', champion_score: 42, runner_up: 'Laconia', runner_up_score: 38 },
    { year: 2015, division: 'Division III', champion: 'Conant', champion_score: 55, runner_up: 'Gilford', runner_up_score: 33 },
    { year: 2014, division: 'Division III', champion: 'Campbell', champion_score: 57, runner_up: 'Fall Mountain', runner_up_score: 41 },
    { year: 2013, division: 'Division III', champion: 'Bow', champion_score: 29, runner_up: 'White Mountains', runner_up_score: 17 },
    { year: 2012, division: 'Division III', champion: 'White Mountains', champion_score: 56, runner_up: 'Campbell', runner_up_score: 51 },
    { year: 2011, division: 'Division III', champion: 'Campbell', champion_score: 42, runner_up: 'Conant', runner_up_score: 33 },
    { year: 1989, division: 'Class M', champion: 'Mascoma', champion_score: 61, runner_up: 'Farmington', runner_up_score: 59, overtime: true },
    
    // Division IV / Class S
    { year: 2025, division: 'Division IV', champion: 'Groveton', champion_score: 36, runner_up: 'Littleton', runner_up_score: 33 },
    { year: 2024, division: 'Division IV', champion: 'Littleton', champion_score: 41, runner_up: 'Newmarket', runner_up_score: 23 },
    { year: 2023, division: 'Division IV', champion: 'Colebrook', champion_score: 47, runner_up: 'Groveton', runner_up_score: 34 },
    { year: 2022, division: 'Division IV', champion: 'Concord Christian', champion_score: 46, runner_up: 'Derryfield', runner_up_score: 28 },
    { year: 2021, division: 'Division IV', champion: 'Hinsdale', champion_score: 63, runner_up: 'Colebrook', runner_up_score: 51 },
    { year: 2020, division: 'Division IV', champion: 'Colebrook', champion_score: 47, runner_up: 'Woodsville', runner_up_score: 36 },
    { year: 2019, division: 'Division IV', champion: 'Littleton', champion_score: 42, runner_up: 'Hinsdale', runner_up_score: 31 },
    { year: 2018, division: 'Division IV', champion: 'Hinsdale', champion_score: 32, runner_up: 'Littleton', runner_up_score: 30 },
    { year: 2017, division: 'Division IV', champion: 'Sunapee', champion_score: 79, runner_up: 'Colebrook', runner_up_score: 52 },
    { year: 2016, division: 'Division IV', champion: 'Sunapee', champion_score: 66, runner_up: 'Littleton', runner_up_score: 62 },
    { year: 2015, division: 'Division IV', champion: 'Sunapee', champion_score: 80, runner_up: 'Colebrook', runner_up_score: 72 },
    { year: 2014, division: 'Division IV', champion: 'Hinsdale', champion_score: 48, runner_up: 'Sunapee', runner_up_score: 35 },
    { year: 2013, division: 'Division IV', champion: 'Groveton', champion_score: 60, runner_up: 'Colebrook', runner_up_score: 40 },
    { year: 2012, division: 'Division IV', champion: 'Littleton', champion_score: 46, runner_up: 'Pittsfield', runner_up_score: 29 },
    { year: 2011, division: 'Division IV', champion: 'Groveton', champion_score: 51, runner_up: 'Moultonborough', runner_up_score: 38 },
    { year: 2010, division: 'Class S', champion: 'Groveton', champion_score: 56, runner_up: 'Derryfield', runner_up_score: 25 },
  ]
};

// Helper function to get all championship appearances for a school
function getSchoolChampionships(schoolName) {
  const results = { boys: [], girls: [] };
  
  CHAMPIONSHIP_HISTORY.boys.forEach(game => {
    if (game.champion === schoolName) {
      results.boys.push({ ...game, result: 'champion' });
    } else if (game.runner_up === schoolName) {
      results.boys.push({ ...game, result: 'runner_up' });
    }
  });
  
  CHAMPIONSHIP_HISTORY.girls.forEach(game => {
    if (game.champion === schoolName) {
      results.girls.push({ ...game, result: 'champion' });
    } else if (game.runner_up === schoolName) {
      results.girls.push({ ...game, result: 'runner_up' });
    }
  });
  
  return results;
}

// Export for Node.js/Supabase import
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CHAMPIONSHIP_HISTORY, getSchoolChampionships };
}
