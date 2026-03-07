'use client';

import { Team, deleteTeam } from '@/lib/firebase/firestore';

interface TeamListProps {
  teams: Team[];
  onTeamsChange: () => void;
}

export default function TeamList({ teams, onTeamsChange }: TeamListProps) {
  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      await deleteTeam(teamId);
      onTeamsChange();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-4">Your Saved Teams</h2>
      {teams.length === 0 ? (
        <p className="text-gray-500">No teams saved yet. Build and save your first team!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{team.name}</h3>
                  <p className="text-sm text-gray-600">Formation: {team.formation}</p>
                </div>
                <button
                  onClick={() => handleDelete(team.id!)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold mb-1">Players:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {team.players.map((player, i) => (
                    <div key={i} className="truncate">
                      {player.name} ({player.position})
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
