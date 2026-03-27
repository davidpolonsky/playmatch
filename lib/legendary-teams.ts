import { Player } from './types';

export interface LegendaryTeam {
  id: string;
  name: string;
  formation: string;
  players: Player[];
  userId: 'legendary'; // Special ID to identify legendary teams
  description: string;
  isLegendary: true;
  premium?: boolean; // Hidden unless user has premium access
}

// Barcelona 2008-2012 (Pep Guardiola Era)
const barcelonaDreamTeam: LegendaryTeam = {
  id: 'legendary-barcelona-2008-2012',
  name: 'Barcelona 2008-2012 (Pep Era)',
  formation: '4-3-3',
  userId: 'legendary',
  description: 'The greatest club team ever assembled. Tiki-taka perfection.',
  isLegendary: true,
  players: [
    // GK
    { id: 'barca-1', name: 'Victor Valdes', position: 'GK', rating: 86, imageUrl: '', isHistorical: true, year: '2009', nationality: 'Spanish', club: 'Barcelona' },
    // DEF
    { id: 'barca-2', name: 'Dani Alves', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Brazilian', club: 'Barcelona' },
    { id: 'barca-3', name: 'Gerard Pique', position: 'DEF', rating: 88, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
    { id: 'barca-4', name: 'Carles Puyol', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '2009', nationality: 'Spanish', club: 'Barcelona' },
    { id: 'barca-5', name: 'Eric Abidal', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2011', nationality: 'French', club: 'Barcelona' },
    // MID
    { id: 'barca-6', name: 'Xavi Hernandez', position: 'MID', rating: 93, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
    { id: 'barca-7', name: 'Sergio Busquets', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
    { id: 'barca-8', name: 'Andres Iniesta', position: 'MID', rating: 92, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
    // FWD
    { id: 'barca-9', name: 'Lionel Messi', position: 'FWD', rating: 96, imageUrl: '', isHistorical: true, year: '2012', nationality: 'Argentine', club: 'Barcelona' },
    { id: 'barca-10', name: 'David Villa', position: 'FWD', rating: 88, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
    { id: 'barca-11', name: 'Pedro Rodriguez', position: 'FWD', rating: 85, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Spanish', club: 'Barcelona' },
  ],
};

// Tottenham All-Time Greats
const tottenhamLegends: LegendaryTeam = {
  id: 'legendary-tottenham-all-time',
  name: 'Tottenham All-Time XI',
  formation: '4-2-3-1',
  userId: 'legendary',
  description: 'The greatest players to ever wear the Lilywhite shirt.',
  isLegendary: true,
  players: [
    // GK
    { id: 'spurs-1', name: 'Pat Jennings', position: 'GK', rating: 89, imageUrl: '', isHistorical: true, year: '1970s', nationality: 'Northern Irish', club: 'Tottenham' },
    // DEF
    { id: 'spurs-2', name: 'Danny Rose', position: 'DEF', rating: 82, imageUrl: '', isHistorical: true, year: '2017', nationality: 'English', club: 'Tottenham' },
    { id: 'spurs-3', name: 'Ledley King', position: 'DEF', rating: 87, imageUrl: '', isHistorical: true, year: '2010', nationality: 'English', club: 'Tottenham' },
    { id: 'spurs-4', name: 'Toby Alderweireld', position: 'DEF', rating: 86, imageUrl: '', isHistorical: true, year: '2017', nationality: 'Belgian', club: 'Tottenham' },
    { id: 'spurs-5', name: 'Kyle Walker', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2017', nationality: 'English', club: 'Tottenham' },
    // MID
    { id: 'spurs-6', name: 'Glenn Hoddle', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1987', nationality: 'English', club: 'Tottenham' },
    { id: 'spurs-7', name: 'Paul Gascoigne', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1990', nationality: 'English', club: 'Tottenham' },
    { id: 'spurs-8', name: 'Luka Modric', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2011', nationality: 'Croatian', club: 'Tottenham' },
    { id: 'spurs-9', name: 'Christian Eriksen', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '2017', nationality: 'Danish', club: 'Tottenham' },
    { id: 'spurs-10', name: 'Gareth Bale', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '2013', nationality: 'Welsh', club: 'Tottenham' },
    // FWD
    { id: 'spurs-11', name: 'Harry Kane', position: 'FWD', rating: 90, imageUrl: '', isHistorical: true, year: '2018', nationality: 'English', club: 'Tottenham' },
  ],
};

// USA 2026 (Current USMNT)
const usmnt2026: LegendaryTeam = {
  id: 'legendary-usmnt-2026',
  name: 'USMNT 2026',
  formation: '4-3-3',
  userId: 'legendary',
  description: 'Current United States Men\'s National Team roster.',
  isLegendary: true,
  players: [
    // GK
    { id: 'usa-1', name: 'Matt Turner', position: 'GK', rating: 78, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    // DEF
    { id: 'usa-2', name: 'Sergino Dest', position: 'DEF', rating: 79, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-3', name: 'Chris Richards', position: 'DEF', rating: 77, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-4', name: 'Cameron Carter-Vickers', position: 'DEF', rating: 76, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-5', name: 'Antonee Robinson', position: 'DEF', rating: 80, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    // MID
    { id: 'usa-6', name: 'Tyler Adams', position: 'MID', rating: 80, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-7', name: 'Weston McKennie', position: 'MID', rating: 81, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-8', name: 'Yunus Musah', position: 'MID', rating: 78, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    // FWD
    { id: 'usa-9', name: 'Christian Pulisic', position: 'FWD', rating: 84, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-10', name: 'Timothy Weah', position: 'FWD', rating: 77, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
    { id: 'usa-11', name: 'Folarin Balogun', position: 'FWD', rating: 79, imageUrl: '', isHistorical: false, year: '2026', nationality: 'American', club: '' },
  ],
};

// Brazil 1970 World Cup Winners
const brazil1970: LegendaryTeam = {
  id: 'legendary-brazil-1970',
  name: 'Brazil 1970 World Cup',
  formation: '4-2-3-1',
  userId: 'legendary',
  description: 'The greatest World Cup team of all time.',
  isLegendary: true,
  players: [
    // GK
    { id: 'brazil-1', name: 'Felix', position: 'GK', rating: 84, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    // DEF
    { id: 'brazil-2', name: 'Carlos Alberto', position: 'DEF', rating: 90, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-3', name: 'Brito', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-4', name: 'Wilson Piazza', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-5', name: 'Everaldo', position: 'DEF', rating: 83, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    // MID
    { id: 'brazil-6', name: 'Clodoaldo', position: 'MID', rating: 86, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-7', name: 'Gerson', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-8', name: 'Rivelino', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-9', name: 'Jairzinho', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    { id: 'brazil-10', name: 'Tostao', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
    // FWD
    { id: 'brazil-11', name: 'Pele', position: 'FWD', rating: 98, imageUrl: '', isHistorical: true, year: '1970', nationality: 'Brazilian', club: '' },
  ],
};

// Real Madrid Galacticos (2001-2006)
const realMadridGalacticos: LegendaryTeam = {
  id: 'legendary-real-madrid-galacticos',
  name: 'Real Madrid Galacticos',
  formation: '4-2-3-1',
  userId: 'legendary',
  description: 'The original superstar team. Peak Galacticos era.',
  isLegendary: true,
  premium: true,
  players: [
    // GK
    { id: 'real-1', name: 'Iker Casillas', position: 'GK', rating: 91, imageUrl: '', isHistorical: true, year: '2005', nationality: 'Spanish', club: 'Real Madrid' },
    // DEF
    { id: 'real-2', name: 'Michel Salgado', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2004', nationality: 'Spanish', club: 'Real Madrid' },
    { id: 'real-3', name: 'Fernando Hierro', position: 'DEF', rating: 88, imageUrl: '', isHistorical: true, year: '2002', nationality: 'Spanish', club: 'Real Madrid' },
    { id: 'real-4', name: 'Roberto Carlos', position: 'DEF', rating: 91, imageUrl: '', isHistorical: true, year: '2002', nationality: 'Brazilian', club: 'Real Madrid' },
    { id: 'real-5', name: 'Sergio Ramos', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '2006', nationality: 'Spanish', club: 'Real Madrid' },
    // MID
    { id: 'real-6', name: 'Claude Makelele', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '2002', nationality: 'French', club: 'Real Madrid' },
    { id: 'real-7', name: 'David Beckham', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2004', nationality: 'English', club: 'Real Madrid' },
    { id: 'real-8', name: 'Zinedine Zidane', position: 'MID', rating: 95, imageUrl: '', isHistorical: true, year: '2002', nationality: 'French', club: 'Real Madrid' },
    { id: 'real-9', name: 'Luis Figo', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '2002', nationality: 'Portuguese', club: 'Real Madrid' },
    { id: 'real-10', name: 'Raul Gonzalez', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '2002', nationality: 'Spanish', club: 'Real Madrid' },
    // FWD
    { id: 'real-11', name: 'Ronaldo Nazario', position: 'FWD', rating: 96, imageUrl: '', isHistorical: true, year: '2003', nationality: 'Brazilian', club: 'Real Madrid' },
  ],
};

// Manchester United Treble Winners 1999
const manchesterUnited1999: LegendaryTeam = {
  id: 'legendary-manchester-united-1999',
  name: 'Manchester United 1999 Treble',
  formation: '4-4-2',
  userId: 'legendary',
  description: 'The historic treble-winning team that conquered Europe.',
  isLegendary: true,
  players: [
    // GK
    { id: 'united-1', name: 'Peter Schmeichel', position: 'GK', rating: 92, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Danish', club: 'Manchester United' },
    // DEF
    { id: 'united-2', name: 'Gary Neville', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '1999', nationality: 'English', club: 'Manchester United' },
    { id: 'united-3', name: 'Jaap Stam', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Dutch', club: 'Manchester United' },
    { id: 'united-4', name: 'Ronny Johnsen', position: 'DEF', rating: 83, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Norwegian', club: 'Manchester United' },
    { id: 'united-5', name: 'Denis Irwin', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Irish', club: 'Manchester United' },
    // MID
    { id: 'united-6', name: 'David Beckham', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '1999', nationality: 'English', club: 'Manchester United' },
    { id: 'united-7', name: 'Roy Keane', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Irish', club: 'Manchester United' },
    { id: 'united-8', name: 'Paul Scholes', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1999', nationality: 'English', club: 'Manchester United' },
    { id: 'united-9', name: 'Ryan Giggs', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Welsh', club: 'Manchester United' },
    // FWD
    { id: 'united-10', name: 'Dwight Yorke', position: 'FWD', rating: 86, imageUrl: '', isHistorical: true, year: '1999', nationality: 'Trinidadian', club: 'Manchester United' },
    { id: 'united-11', name: 'Andy Cole', position: 'FWD', rating: 85, imageUrl: '', isHistorical: true, year: '1999', nationality: 'English', club: 'Manchester United' },
  ],
};

// England 2026 World Cup
const england2026: LegendaryTeam = {
  id: 'legendary-england-2026',
  name: 'England 2026 World Cup',
  formation: '4-3-3',
  userId: 'legendary',
  description: 'England\'s golden generation at the 2026 World Cup. Bellingham, Kane, Saka — it\'s coming home.',
  isLegendary: true,
  players: [
    // GK
    { id: 'eng-1', name: 'Jordan Pickford', position: 'GK', rating: 83, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    // DEF
    { id: 'eng-2', name: 'Trent Alexander-Arnold', position: 'DEF', rating: 87, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-3', name: 'John Stones', position: 'DEF', rating: 85, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-4', name: 'Marc Guehi', position: 'DEF', rating: 83, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-5', name: 'Kieran Trippier', position: 'DEF', rating: 82, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    // MID
    { id: 'eng-6', name: 'Declan Rice', position: 'MID', rating: 88, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-7', name: 'Jude Bellingham', position: 'MID', rating: 91, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-8', name: 'Phil Foden', position: 'MID', rating: 89, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    // FWD
    { id: 'eng-9', name: 'Bukayo Saka', position: 'FWD', rating: 89, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-10', name: 'Harry Kane', position: 'FWD', rating: 90, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
    { id: 'eng-11', name: 'Cole Palmer', position: 'FWD', rating: 87, imageUrl: '', isHistorical: false, year: '2026', nationality: 'English', club: '' },
  ],
};

// Wrexham AFC 2024-2026 (Current Squad)
const wrexhamCurrent: LegendaryTeam = {
  id: 'legendary-wrexham-2024',
  name: 'Wrexham AFC 2024-26',
  formation: '5-3-2',
  userId: 'legendary',
  description: 'Hollywood\'s favorite team. Back-to-back promotions under Reynolds & McElhenney.',
  isLegendary: true,
  players: [
    // GK
    { id: 'wrex-1', name: 'Arthur Okonkwo', position: 'GK', rating: 72, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    // DEF
    { id: 'wrex-2', name: 'Ben Tozer', position: 'DEF', rating: 74, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    { id: 'wrex-3', name: 'Aaron Hayden', position: 'DEF', rating: 71, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Welsh', club: 'Wrexham' },
    { id: 'wrex-4', name: 'Eoghan O\'Connell', position: 'DEF', rating: 72, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Irish', club: 'Wrexham' },
    { id: 'wrex-5', name: 'James McClean', position: 'DEF', rating: 73, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Irish', club: 'Wrexham' },
    { id: 'wrex-6', name: 'Ryan Barnett', position: 'DEF', rating: 72, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    // MID
    { id: 'wrex-7', name: 'Elliot Lee', position: 'MID', rating: 75, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    { id: 'wrex-8', name: 'Andy Cannon', position: 'MID', rating: 73, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    { id: 'wrex-9', name: 'George Dobson', position: 'MID', rating: 74, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    // FWD
    { id: 'wrex-10', name: 'Paul Mullin', position: 'FWD', rating: 78, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
    { id: 'wrex-11', name: 'Ollie Palmer', position: 'FWD', rating: 75, imageUrl: '', isHistorical: false, year: '2025', nationality: 'English', club: 'Wrexham' },
  ],
};

// Inter Miami CF 2025 Champions
const interMiami2025: LegendaryTeam = {
  id: 'legendary-inter-miami-2025',
  name: 'Inter Miami 2025 Champions',
  formation: '4-3-3',
  userId: 'legendary',
  description: 'MLS Champions. Messi\'s Miami masterclass.',
  isLegendary: true,
  players: [
    // GK
    { id: 'miami-1', name: 'Drake Callender', position: 'GK', rating: 78, imageUrl: '', isHistorical: false, year: '2025', nationality: 'American', club: 'Inter Miami' },
    // DEF
    { id: 'miami-2', name: 'Jordi Alba', position: 'DEF', rating: 86, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Spanish', club: 'Inter Miami' },
    { id: 'miami-3', name: 'Sergio Busquets', position: 'DEF', rating: 85, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Spanish', club: 'Inter Miami' },
    { id: 'miami-4', name: 'Tomas Aviles', position: 'DEF', rating: 75, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Argentine', club: 'Inter Miami' },
    { id: 'miami-5', name: 'DeAndre Yedlin', position: 'DEF', rating: 74, imageUrl: '', isHistorical: false, year: '2025', nationality: 'American', club: 'Inter Miami' },
    // MID
    { id: 'miami-6', name: 'Diego Gomez', position: 'MID', rating: 77, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Paraguayan', club: 'Inter Miami' },
    { id: 'miami-7', name: 'Federico Redondo', position: 'MID', rating: 76, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Argentine', club: 'Inter Miami' },
    { id: 'miami-8', name: 'Julian Gressel', position: 'MID', rating: 73, imageUrl: '', isHistorical: false, year: '2025', nationality: 'German', club: 'Inter Miami' },
    // FWD
    { id: 'miami-9', name: 'Lionel Messi', position: 'FWD', rating: 91, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Argentine', club: 'Inter Miami' },
    { id: 'miami-10', name: 'Luis Suarez', position: 'FWD', rating: 84, imageUrl: '', isHistorical: false, year: '2025', nationality: 'Uruguayan', club: 'Inter Miami' },
    { id: 'miami-11', name: 'Robert Taylor', position: 'FWD', rating: 74, imageUrl: '', isHistorical: false, year: '2025', nationality: 'American', club: 'Inter Miami' },
  ],
};

export const LEGENDARY_TEAMS: LegendaryTeam[] = [
  barcelonaDreamTeam,
  tottenhamLegends,
  usmnt2026,
  england2026,
  brazil1970,
  realMadridGalacticos,
  manchesterUnited1999,
  wrexhamCurrent,
  interMiami2025,
];

export const getLegendaryTeams = (includePremium: boolean = false): LegendaryTeam[] => {
  if (includePremium) {
    return LEGENDARY_TEAMS;
  }
  return LEGENDARY_TEAMS.filter(team => !team.premium);
};

export const getLegendaryTeamById = (id: string): LegendaryTeam | undefined => {
  return LEGENDARY_TEAMS.find(team => team.id === id);
};
