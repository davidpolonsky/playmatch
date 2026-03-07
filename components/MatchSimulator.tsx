'use client';

import { useState } from 'react';
import { Team, saveMatchResult } from '@/lib/firebase/firestore';

interface MatchSimulatorProps {
  teams: Team[];
  userId: string;
}

export default function MatchSimulator({ teams, userId }: MatchSimulatorProps) {
  const [team1Id, setTeam1Id] = useState('');
  const [team2Id, setTeam2Id] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulate = async () => {
    if (!team1Id || !team2Id) {
      alert('Please select both teams');
      return;
    }

    const team1 = teams.find(t => t.id === team1Id);
    const team2 = teams.find(t => t.id === team2Id);

    if (!team1 || !team2) return;

    setSimulating(true);
    setResult(null);

    try {
      const response = await fetch('/api/simulate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team1Name: team1.name,
          team1Players: team1.players,
          team2Name: team2.name,
          team2Players: team2.players,
        }),
      });

      const matchResult = await response.json();
      setResult(matchResult);

      await saveMatchResult({
        team1Id: team1.id!,
        team2Id: team2.id!,
        team1Name: team1.name,
        team2Name: team2.name,
        team1Score: matchResult.team1Score,
        team2Score: matchResult.team2Score,
        summary: matchResult.summary,
        userId,
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to simulate match');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Simulate Match</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Team 1</label>
          <select
            value={team1Id}
            onChange={(e) => setTeam1Id(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Team 1</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team 2</label>
          <select
            value={team2Id}
            onChange={(e) => setTeam2Id(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Team 2</option>
            {teams.filter(t => t.id !== team1Id).map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSimulate}
        className="btn-primary w-full mb-6"
        disabled={!team1Id || !team2Id || simulating}
      >
        {simulating ? 'Simulating Match...' : 'Simulate Match'}
      </button>

      {result && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="text-center mb-4">
            <h3 className="text-3xl font-bold mb-2">Final Score</h3>
            <div className="text-4xl font-bold text-blue-600">
              {teams.find(t => t.id === team1Id)?.name} {result.team1Score} - {result.team2Score} {teams.find(t => t.id === team2Id)?.name}
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-bold text-lg mb-2">Match Summary</h4>
            <p className="text-gray-700 whitespace-pre-line">{result.summary}</p>
          </div>

          {result.manOfTheMatch && (
            <div className="mt-4 bg-yellow-50 p-4 rounded">
              <h4 className="font-bold">⭐ Man of the Match</h4>
              <p>{result.manOfTheMatch}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
