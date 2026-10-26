import fs from 'fs';
import path from 'path';
import { LeaderboardEntry } from './types';

const LEADERBOARD_FILE = path.join(__dirname, '..', 'leaderboard.json');

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // If file is corrupted, start fresh
  }
  return [];
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export function addLeaderboardEntry(entry: LeaderboardEntry): void {
  const entries = loadLeaderboard();
  entries.push(entry);
  // Sort by shots ascending (fewer is better)
  entries.sort((a, b) => a.shots - b.shots);
  saveLeaderboard(entries);
}

export function getLeaderboard(): LeaderboardEntry[] {
  return loadLeaderboard();
}
