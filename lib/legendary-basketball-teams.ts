import { BasketballPlayer } from './types-basketball';

export interface LegendaryBasketballTeam {
  id: string;
  name: string;
  lineup: string;
  players: BasketballPlayer[];
  userId: 'legendary';
  description: string;
  isLegendary: true;
  era: string;
}

// ── 1992 USA Dream Team ────────────────────────────────────────
const dreamTeam1992: LegendaryBasketballTeam = {
  id: 'legendary-bball-dream-team-1992',
  name: '1992 USA Dream Team',
  lineup: 'Standard',
  userId: 'legendary',
  description: 'The greatest team ever assembled. Demolished every opponent at Barcelona.',
  isLegendary: true,
  era: '1992',
  players: [
    { id: 'dt-1', name: 'Magic Johnson',    position: 'PG', rating: 97, imageUrl: '', isHistorical: true, year: '1992', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
    { id: 'dt-2', name: 'Michael Jordan',   position: 'SG', rating: 99, imageUrl: '', isHistorical: true, year: '1992', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'dt-3', name: 'Scottie Pippen',   position: 'SF', rating: 93, imageUrl: '', isHistorical: true, year: '1992', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'dt-4', name: 'Charles Barkley',  position: 'PF', rating: 95, imageUrl: '', isHistorical: true, year: '1992', nationality: 'American', nbaTeam: 'Philadelphia 76ers' },
    { id: 'dt-5', name: 'Patrick Ewing',    position: 'C',  rating: 91, imageUrl: '', isHistorical: true, year: '1992', nationality: 'American', nbaTeam: 'New York Knicks' },
  ],
};

// ── 1995-96 Chicago Bulls (72-10) ──────────────────────────────
const bulls9596: LegendaryBasketballTeam = {
  id: 'legendary-bball-bulls-9596',
  name: '1995-96 Chicago Bulls',
  lineup: 'Standard',
  userId: 'legendary',
  description: '72-10. The greatest regular-season team in NBA history.',
  isLegendary: true,
  era: '1996',
  players: [
    { id: 'bulls-1', name: 'Ron Harper',       position: 'PG', rating: 82, imageUrl: '', isHistorical: true, year: '1996', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'bulls-2', name: 'Michael Jordan',   position: 'SG', rating: 99, imageUrl: '', isHistorical: true, year: '1996', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'bulls-3', name: 'Scottie Pippen',   position: 'SF', rating: 94, imageUrl: '', isHistorical: true, year: '1996', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'bulls-4', name: 'Dennis Rodman',    position: 'PF', rating: 89, imageUrl: '', isHistorical: true, year: '1996', nationality: 'American', nbaTeam: 'Chicago Bulls' },
    { id: 'bulls-5', name: 'Luc Longley',      position: 'C',  rating: 78, imageUrl: '', isHistorical: true, year: '1996', nationality: 'Australian', nbaTeam: 'Chicago Bulls' },
  ],
};

// ── 2015-16 Golden State Warriors (73-9) ───────────────────────
const warriors1516: LegendaryBasketballTeam = {
  id: 'legendary-bball-warriors-1516',
  name: '2015-16 Golden State Warriors',
  lineup: 'Small Ball',
  userId: 'legendary',
  description: '73-9 — the record-breakers. Curry, Thompson, Durant era begins.',
  isLegendary: true,
  era: '2016',
  players: [
    { id: 'gsw-1', name: 'Stephen Curry',   position: 'PG', rating: 98, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Golden State Warriors' },
    { id: 'gsw-2', name: 'Klay Thompson',   position: 'SG', rating: 92, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Golden State Warriors' },
    { id: 'gsw-3', name: 'Harrison Barnes', position: 'SF', rating: 81, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Golden State Warriors' },
    { id: 'gsw-4', name: 'Draymond Green',  position: 'PF', rating: 90, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Golden State Warriors' },
    { id: 'gsw-5', name: 'Andrew Bogut',    position: 'C',  rating: 82, imageUrl: '', isHistorical: true, year: '2016', nationality: 'Australian', nbaTeam: 'Golden State Warriors' },
  ],
};

// ── 2016 Cleveland Cavaliers ───────────────────────────────────
const cavs2016: LegendaryBasketballTeam = {
  id: 'legendary-bball-cavs-2016',
  name: '2016 Cleveland Cavaliers',
  lineup: 'Stretch-4',
  userId: 'legendary',
  description: 'Down 3-1 and came back. LeBron\'s greatest championship.',
  isLegendary: true,
  era: '2016',
  players: [
    { id: 'cavs-1', name: 'Kyrie Irving',    position: 'PG', rating: 94, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Cleveland Cavaliers' },
    { id: 'cavs-2', name: 'Iman Shumpert',   position: 'SG', rating: 77, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Cleveland Cavaliers' },
    { id: 'cavs-3', name: 'LeBron James',    position: 'SF', rating: 98, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Cleveland Cavaliers' },
    { id: 'cavs-4', name: 'Kevin Love',      position: 'PF', rating: 88, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Cleveland Cavaliers' },
    { id: 'cavs-5', name: 'Tristan Thompson', position: 'C', rating: 79, imageUrl: '', isHistorical: true, year: '2016', nationality: 'American', nbaTeam: 'Cleveland Cavaliers' },
  ],
};

// ── 1986-87 Showtime Lakers ────────────────────────────────────
const lakers8687: LegendaryBasketballTeam = {
  id: 'legendary-bball-lakers-8687',
  name: '1986-87 Showtime Lakers',
  lineup: 'Small Ball',
  userId: 'legendary',
  description: 'Showtime. Magic & Kareem at their peak — fast, glamorous, unstoppable.',
  isLegendary: true,
  era: '1987',
  players: [
    { id: 'lal-1', name: 'Magic Johnson',    position: 'PG', rating: 98, imageUrl: '', isHistorical: true, year: '1987', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
    { id: 'lal-2', name: 'Byron Scott',      position: 'SG', rating: 84, imageUrl: '', isHistorical: true, year: '1987', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
    { id: 'lal-3', name: 'James Worthy',     position: 'SF', rating: 91, imageUrl: '', isHistorical: true, year: '1987', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
    { id: 'lal-4', name: 'Kurt Rambis',      position: 'PF', rating: 78, imageUrl: '', isHistorical: true, year: '1987', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
    { id: 'lal-5', name: 'Kareem Abdul-Jabbar', position: 'C', rating: 96, imageUrl: '', isHistorical: true, year: '1987', nationality: 'American', nbaTeam: 'Los Angeles Lakers' },
  ],
};

// ── 2003-04 Detroit Pistons ────────────────────────────────────
const pistons2004: LegendaryBasketballTeam = {
  id: 'legendary-bball-pistons-2004',
  name: '2003-04 Detroit Pistons',
  lineup: 'Standard',
  userId: 'legendary',
  description: 'No superstars, all heart. The ultimate team basketball champions.',
  isLegendary: true,
  era: '2004',
  players: [
    { id: 'det-1', name: 'Chauncey Billups', position: 'PG', rating: 90, imageUrl: '', isHistorical: true, year: '2004', nationality: 'American', nbaTeam: 'Detroit Pistons' },
    { id: 'det-2', name: 'Richard Hamilton',  position: 'SG', rating: 87, imageUrl: '', isHistorical: true, year: '2004', nationality: 'American', nbaTeam: 'Detroit Pistons' },
    { id: 'det-3', name: 'Tayshaun Prince',   position: 'SF', rating: 84, imageUrl: '', isHistorical: true, year: '2004', nationality: 'American', nbaTeam: 'Detroit Pistons' },
    { id: 'det-4', name: 'Rasheed Wallace',   position: 'PF', rating: 88, imageUrl: '', isHistorical: true, year: '2004', nationality: 'American', nbaTeam: 'Detroit Pistons' },
    { id: 'det-5', name: 'Ben Wallace',       position: 'C',  rating: 89, imageUrl: '', isHistorical: true, year: '2004', nationality: 'American', nbaTeam: 'Detroit Pistons' },
  ],
};

// ── 2002-03 San Antonio Spurs ──────────────────────────────────
const spurs2003: LegendaryBasketballTeam = {
  id: 'legendary-bball-spurs-2003',
  name: '2002-03 San Antonio Spurs',
  lineup: 'Twin Towers',
  userId: 'legendary',
  description: 'The Fundamental. Tim Duncan\'s defining championship with the Admiral.',
  isLegendary: true,
  era: '2003',
  players: [
    { id: 'sas-1', name: 'Tony Parker',      position: 'PG', rating: 87, imageUrl: '', isHistorical: true, year: '2003', nationality: 'American', nbaTeam: 'San Antonio Spurs' },
    { id: 'sas-2', name: 'Manu Ginobili',    position: 'SG', rating: 88, imageUrl: '', isHistorical: true, year: '2003', nationality: 'American', nbaTeam: 'San Antonio Spurs' },
    { id: 'sas-3', name: 'Bruce Bowen',      position: 'SF', rating: 79, imageUrl: '', isHistorical: true, year: '2003', nationality: 'American', nbaTeam: 'San Antonio Spurs' },
    { id: 'sas-4', name: 'Tim Duncan',       position: 'PF', rating: 97, imageUrl: '', isHistorical: true, year: '2003', nationality: 'American', nbaTeam: 'San Antonio Spurs' },
    { id: 'sas-5', name: 'David Robinson',   position: 'C',  rating: 93, imageUrl: '', isHistorical: true, year: '2003', nationality: 'American', nbaTeam: 'San Antonio Spurs' },
  ],
};

// ── 1985-86 Boston Celtics (Larry Bird era) ────────────────────
const celtics8586: LegendaryBasketballTeam = {
  id: 'legendary-bball-celtics-8586',
  name: '1985-86 Boston Celtics',
  lineup: 'Twin Towers',
  userId: 'legendary',
  description: "Larry Bird's masterpiece. 67 wins, McHale & Parish dominating the paint — the greatest Celtics team ever.",
  isLegendary: true,
  era: '1986',
  players: [
    { id: 'bos-1', name: 'Dennis Johnson', position: 'PG', rating: 88, imageUrl: '', isHistorical: true, year: '1986', nationality: 'American', nbaTeam: 'Boston Celtics' },
    { id: 'bos-2', name: 'Danny Ainge',    position: 'SG', rating: 83, imageUrl: '', isHistorical: true, year: '1986', nationality: 'American', nbaTeam: 'Boston Celtics' },
    { id: 'bos-3', name: 'Larry Bird',     position: 'SF', rating: 98, imageUrl: '', isHistorical: true, year: '1986', nationality: 'American', nbaTeam: 'Boston Celtics' },
    { id: 'bos-4', name: 'Kevin McHale',   position: 'PF', rating: 95, imageUrl: '', isHistorical: true, year: '1986', nationality: 'American', nbaTeam: 'Boston Celtics' },
    { id: 'bos-5', name: 'Robert Parish',  position: 'C',  rating: 91, imageUrl: '', isHistorical: true, year: '1986', nationality: 'American', nbaTeam: 'Boston Celtics' },
  ],
};

// ── Eurozone 2010s — Best European NBA Players of the 2010s ────
const eurozone2010s: LegendaryBasketballTeam = {
  id: 'legendary-bball-eurozone-2010s',
  name: 'Eurozone 2010s',
  lineup: 'Stretch-4',
  userId: 'legendary',
  description: "Dirk. Parker. Giannis emerging. The European invasion at its peak — five countries, one devastating lineup.",
  isLegendary: true,
  era: '2015',
  players: [
    { id: 'ez10b-1', name: 'Tony Parker',          position: 'PG', rating: 91, imageUrl: '', isHistorical: true, year: '2013', nationality: 'French',   nbaTeam: 'San Antonio Spurs' },
    { id: 'ez10b-2', name: 'Nicolas Batum',         position: 'SG', rating: 83, imageUrl: '', isHistorical: true, year: '2015', nationality: 'French',   nbaTeam: 'Portland Trail Blazers' },
    { id: 'ez10b-3', name: 'Giannis Antetokounmpo', position: 'SF', rating: 94, imageUrl: '', isHistorical: true, year: '2019', nationality: 'Greek',    nbaTeam: 'Milwaukee Bucks' },
    { id: 'ez10b-4', name: 'Dirk Nowitzki',         position: 'PF', rating: 95, imageUrl: '', isHistorical: true, year: '2011', nationality: 'German',   nbaTeam: 'Dallas Mavericks' },
    { id: 'ez10b-5', name: 'Marc Gasol',            position: 'C',  rating: 89, imageUrl: '', isHistorical: true, year: '2013', nationality: 'Spanish',  nbaTeam: 'Memphis Grizzlies' },
  ],
};

// ── Eurozone 2020s — Best European NBA Players of the 2020s ────
const eurozone2020s: LegendaryBasketballTeam = {
  id: 'legendary-bball-eurozone-2020s',
  name: 'Eurozone 2020s',
  lineup: 'Standard',
  userId: 'legendary',
  description: "Jokic. Luka. Giannis. The most dominant collection of European talent in NBA history — three MVPs in one lineup.",
  isLegendary: true,
  era: '2023',
  players: [
    { id: 'ez20b-1', name: 'Luka Doncic',           position: 'PG', rating: 98, imageUrl: '', isHistorical: false, year: '2023', nationality: 'Slovenian', nbaTeam: 'Dallas Mavericks' },
    { id: 'ez20b-2', name: 'Franz Wagner',           position: 'SG', rating: 86, imageUrl: '', isHistorical: false, year: '2024', nationality: 'German',    nbaTeam: 'Orlando Magic' },
    { id: 'ez20b-3', name: 'Giannis Antetokounmpo', position: 'SF', rating: 98, imageUrl: '', isHistorical: false, year: '2021', nationality: 'Greek',      nbaTeam: 'Milwaukee Bucks' },
    { id: 'ez20b-4', name: 'Domantas Sabonis',       position: 'PF', rating: 88, imageUrl: '', isHistorical: false, year: '2023', nationality: 'Lithuanian', nbaTeam: 'Sacramento Kings' },
    { id: 'ez20b-5', name: 'Nikola Jokic',           position: 'C',  rating: 99, imageUrl: '', isHistorical: false, year: '2023', nationality: 'Serbian',    nbaTeam: 'Denver Nuggets' },
  ],
};

export const LEGENDARY_BASKETBALL_TEAMS: LegendaryBasketballTeam[] = [
  dreamTeam1992,
  bulls9596,
  warriors1516,
  cavs2016,
  lakers8687,
  pistons2004,
  spurs2003,
  celtics8586,
  eurozone2010s,
  eurozone2020s,
];

export const getLegendaryBasketballTeamById = (id: string) =>
  LEGENDARY_BASKETBALL_TEAMS.find(t => t.id === id);
