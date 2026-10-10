export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  owner: { login: string; avatar_url: string; html_url: string };
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  subscribers_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  license: { name: string; spdx_id: string } | null;
  topics: string[];
  private: boolean;
  archived: boolean;
  size: number;
}
export interface Week {
  week: number;
  total: number;
  days: number[];
}
export interface Readme {
  content: string;
  path: string;
  html_url: string;
}
export interface IssueCounts {
  open: number;
  closed: number;
}
export type Resource<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable" | "error" | "pending"; message: string };
export interface Analysis {
  repo: Repository;
  languages: Resource<Record<string, number>>;
  activity: Resource<Week[]>;
  readme: Resource<Readme | null>;
  issues: Resource<IssueCounts>;
  analyzedAt: string;
}
export interface HistoryEntry {
  fullName: string;
  analyzedAt: string;
}
export interface Profile {
  login: string;
  avatar_url: string;
  html_url: string;
}
export interface PersonalRepo {
  id: number;
  full_name: string;
  private: boolean;
  description: string | null;
}
