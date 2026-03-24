import { Player } from './firebase/firestore';

export interface LegendaryTeam {
  id: string;
  name: string;
  formation: string;
  players: Player[];
  userId: 'legendary'; // Special ID to identify legendary teams
  description: string;
  isLegendary: true;
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
    { id: 'barca-1', name: 'Victor Valdes', position: 'GK', rating: 86, imageUrl: '', isHistorical: true, year: '2009' },
    // DEF
    { id: 'barca-2', name: 'Dani Alves', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'barca-3', name: 'Gerard Pique', position: 'DEF', rating: 88, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'barca-4', name: 'Carles Puyol', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '2009' },
    { id: 'barca-5', name: 'Eric Abidal', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2011' },
    // MID
    { id: 'barca-6', name: 'Xavi Hernandez', position: 'MID', rating: 93, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'barca-7', name: 'Sergio Busquets', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'barca-8', name: 'Andres Iniesta', position: 'MID', rating: 92, imageUrl: '', isHistorical: true, year: '2011' },
    // FWD
    { id: 'barca-9', name: 'Lionel Messi', position: 'FWD', rating: 96, imageUrl: '', isHistorical: true, year: '2012' },
    { id: 'barca-10', name: 'David Villa', position: 'FWD', rating: 88, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'barca-11', name: 'Pedro Rodriguez', position: 'FWD', rating: 85, imageUrl: '', isHistorical: true, year: '2011' },
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
    { id: 'spurs-1', name: 'Pat Jennings', position: 'GK', rating: 89, imageUrl: '', isHistorical: true, year: '1970s' },
    // DEF
    { id: 'spurs-2', name: 'Danny Rose', position: 'DEF', rating: 82, imageUrl: '', isHistorical: true, year: '2017' },
    { id: 'spurs-3', name: 'Ledley King', position: 'DEF', rating: 87, imageUrl: '', isHistorical: true, year: '2010' },
    { id: 'spurs-4', name: 'Toby Alderweireld', position: 'DEF', rating: 86, imageUrl: '', isHistorical: true, year: '2017' },
    { id: 'spurs-5', name: 'Kyle Walker', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2017' },
    // MID
    { id: 'spurs-6', name: 'Glenn Hoddle', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1987' },
    { id: 'spurs-7', name: 'Paul Gascoigne', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1990' },
    { id: 'spurs-8', name: 'Luka Modric', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2011' },
    { id: 'spurs-9', name: 'Christian Eriksen', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '2017' },
    { id: 'spurs-10', name: 'Gareth Bale', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '2013' },
    // FWD
    { id: 'spurs-11', name: 'Harry Kane', position: 'FWD', rating: 90, imageUrl: '', isHistorical: true, year: '2018' },
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
    { id: 'usa-1', name: 'Matt Turner', position: 'GK', rating: 78, imageUrl: '', isHistorical: false, year: '2026' },
    // DEF
    { id: 'usa-2', name: 'Sergino Dest', position: 'DEF', rating: 79, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-3', name: 'Chris Richards', position: 'DEF', rating: 77, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-4', name: 'Cameron Carter-Vickers', position: 'DEF', rating: 76, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-5', name: 'Antonee Robinson', position: 'DEF', rating: 80, imageUrl: '', isHistorical: false, year: '2026' },
    // MID
    { id: 'usa-6', name: 'Tyler Adams', position: 'MID', rating: 80, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-7', name: 'Weston McKennie', position: 'MID', rating: 81, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-8', name: 'Yunus Musah', position: 'MID', rating: 78, imageUrl: '', isHistorical: false, year: '2026' },
    // FWD
    { id: 'usa-9', name: 'Christian Pulisic', position: 'FWD', rating: 84, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-10', name: 'Timothy Weah', position: 'FWD', rating: 77, imageUrl: '', isHistorical: false, year: '2026' },
    { id: 'usa-11', name: 'Folarin Balogun', position: 'FWD', rating: 79, imageUrl: '', isHistorical: false, year: '2026' },
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
    { id: 'brazil-1', name: 'Felix', position: 'GK', rating: 84, imageUrl: '', isHistorical: true, year: '1970' },
    // DEF
    { id: 'brazil-2', name: 'Carlos Alberto', position: 'DEF', rating: 90, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-3', name: 'Brito', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-4', name: 'Wilson Piazza', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-5', name: 'Everaldo', position: 'DEF', rating: 83, imageUrl: '', isHistorical: true, year: '1970' },
    // MID
    { id: 'brazil-6', name: 'Clodoaldo', position: 'MID', rating: 86, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-7', name: 'Gerson', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-8', name: 'Rivelino', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-9', name: 'Jairzinho', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '1970' },
    { id: 'brazil-10', name: 'Tostao', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1970' },
    // FWD
    { id: 'brazil-11', name: 'Pele', position: 'FWD', rating: 98, imageUrl: '', isHistorical: true, year: '1970' },
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
  players: [
    // GK
    { id: 'real-1', name: 'Iker Casillas', position: 'GK', rating: 91, imageUrl: '', isHistorical: true, year: '2005' },
    // DEF
    { id: 'real-2', name: 'Michel Salgado', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '2004' },
    { id: 'real-3', name: 'Fernando Hierro', position: 'DEF', rating: 88, imageUrl: '', isHistorical: true, year: '2002' },
    { id: 'real-4', name: 'Roberto Carlos', position: 'DEF', rating: 91, imageUrl: '', isHistorical: true, year: '2002' },
    { id: 'real-5', name: 'Sergio Ramos', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '2006' },
    // MID
    { id: 'real-6', name: 'Claude Makelele', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '2002' },
    { id: 'real-7', name: 'David Beckham', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '2004' },
    { id: 'real-8', name: 'Zinedine Zidane', position: 'MID', rating: 95, imageUrl: '', isHistorical: true, year: '2002' },
    { id: 'real-9', name: 'Luis Figo', position: 'MID', rating: 91, imageUrl: '', isHistorical: true, year: '2002' },
    { id: 'real-10', name: 'Raul Gonzalez', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '2002' },
    // FWD
    { id: 'real-11', name: 'Ronaldo Nazario', position: 'FWD', rating: 96, imageUrl: '', isHistorical: true, year: '2003' },
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
    { id: 'united-1', name: 'Peter Schmeichel', position: 'GK', rating: 92, imageUrl: '', isHistorical: true, year: '1999' },
    // DEF
    { id: 'united-2', name: 'Gary Neville', position: 'DEF', rating: 85, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-3', name: 'Jaap Stam', position: 'DEF', rating: 89, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-4', name: 'Ronny Johnsen', position: 'DEF', rating: 83, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-5', name: 'Denis Irwin', position: 'DEF', rating: 84, imageUrl: '', isHistorical: true, year: '1999' },
    // MID
    { id: 'united-6', name: 'David Beckham', position: 'MID', rating: 87, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-7', name: 'Roy Keane', position: 'MID', rating: 90, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-8', name: 'Paul Scholes', position: 'MID', rating: 88, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-9', name: 'Ryan Giggs', position: 'MID', rating: 89, imageUrl: '', isHistorical: true, year: '1999' },
    // FWD
    { id: 'united-10', name: 'Dwight Yorke', position: 'FWD', rating: 86, imageUrl: '', isHistorical: true, year: '1999' },
    { id: 'united-11', name: 'Andy Cole', position: 'FWD', rating: 85, imageUrl: '', isHistorical: true, year: '1999' },
  ],
};

export const LEGENDARY_TEAMS: LegendaryTeam[] = [
  barcelonaDreamTeam,
  tottenhamLegends,
  usmnt2026,
  brazil1970,
  realMadridGalacticos,
  manchesterUnited1999,
];

export const getLegendaryTeams = (): LegendaryTeam[] => {
  return LEGENDARY_TEAMS;
};

export const getLegendaryTeamById = (id: string): LegendaryTeam | undefined => {
  return LEGENDARY_TEAMS.find(team => team.id === id);
};
