import { Player } from "./Player.js";

const TEAM_SIZE = 5;
const MATCH_SIZE = TEAM_SIZE * 2;

export type Match = { teamA: Player[]; teamB: Player[]; averageMMR: number };

export class MatchBuilder {
  private readonly sortedPlayers: Player[];

  constructor(players: Player[]) {
    this.sortedPlayers = [...players].sort((a, b) => a.mmr - b.mmr);
  }

  build(): Match[] {
    const teams = this.groupIntoTeams();
    const ranked = this.rankTeamsByAverageMMR(teams);
    return this.pairTeamsAsMatches(ranked);
  }

  private groupIntoTeams(): Player[][] {
    const teams: Player[][] = [];

    for (let i = 0; i + MATCH_SIZE <= this.sortedPlayers.length; i += MATCH_SIZE) {
      const group = this.shuffle(this.sortedPlayers.slice(i, i + MATCH_SIZE));
      teams.push(group.slice(0, TEAM_SIZE));
      teams.push(group.slice(TEAM_SIZE));
    }

    return teams;
  }

  private shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private averageMMR(team: Player[]): number {
    return team.reduce((sum, p) => sum + p.mmr, 0) / team.length;
  }

  private rankTeamsByAverageMMR(teams: Player[][]): Player[][] {
    return [...teams].sort((a, b) => this.averageMMR(a) - this.averageMMR(b));
  }

  private pairTeamsAsMatches(ranked: Player[][]): Match[] {
    const matches: Match[] = [];

    for (let i = 0; i + 1 < ranked.length; i += 2) {
      const teamA = ranked[i];
      const teamB = ranked[i + 1];
      matches.push({ teamA, teamB, averageMMR: (this.averageMMR(teamA) + this.averageMMR(teamB)) / 2 });
    }

    return matches;
  }
}
