export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: 'Orchestrator' | 'Planner' | 'Coder' | 'Tester' | 'Debugger' | 'Reviewer';
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
}

export interface AutomationState {
  status: 'INIT' | 'PLANNED' | 'CODE_GENERATED' | 'TEST_FAILED' | 'DEBUGGING' | 'TEST_PASSED' | 'REVIEWED' | 'PR_CREATED' | 'FAILED';
  currentIssue: GitHubIssue | null;
  logs: AgentLog[];
  plan?: any;
  diff?: string;
  retryCount: number;
}
