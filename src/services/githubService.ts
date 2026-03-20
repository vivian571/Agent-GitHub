import axios from 'axios';
import { GitHubIssue } from '../types';

export class GitHubService {
  private token: string;
  private owner: string;
  private repo: string;

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  private get headers() {
    return {
      Authorization: `token ${this.token}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async fetchIssues(): Promise<GitHubIssue[]> {
    const response = await axios.get(
      `https://api.github.com/repos/${this.owner}/${this.repo}/issues`,
      { headers: this.headers }
    );
    return response.data.filter((issue: any) => !issue.pull_request);
  }

  async createPR(title: string, body: string, head: string, base: string = 'main') {
    const response = await axios.post(
      `https://api.github.com/repos/${this.owner}/${this.repo}/pulls`,
      { title, body, head, base },
      { headers: this.headers }
    );
    return response.data;
  }

  async getFileContent(path: string) {
    const response = await axios.get(
      `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
      { headers: this.headers }
    );
    return atob(response.data.content);
  }
}
