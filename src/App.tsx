import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Github, 
  Play, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Settings,
  ChevronRight,
  GitPullRequest,
  Code2,
  ListTodo,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GitHubIssue, AgentLog, AutomationState } from './types';
import { GitHubService } from './services/githubService';
import { AgentService } from './services/agentService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [config, setConfig] = useState({
    token: '',
    owner: '',
    repo: ''
  });
  const [isConfigOpen, setIsConfigOpen] = useState(true);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  
  const [state, setState] = useState<AutomationState>({
    status: 'INIT',
    currentIssue: null,
    logs: [],
    retryCount: 0
  });

  const agentService = useRef(new AgentService());
  const githubService = useRef<GitHubService | null>(null);

  const addLog = useCallback((agent: AgentLog['agent'], message: string, type: AgentLog['type'] = 'info', data?: any) => {
    setState(prev => ({
      ...prev,
      logs: [
        {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString(),
          agent,
          message,
          type,
          data
        },
        ...prev.logs
      ]
    }));
  }, []);

  const fetchIssues = async () => {
    if (!config.token || !config.owner || !config.repo) return;
    setIsLoadingIssues(true);
    try {
      githubService.current = new GitHubService(config.token, config.owner, config.repo);
      const data = await githubService.current.fetchIssues();
      setIssues(data);
      addLog('Orchestrator', `Fetched ${data.length} issues from ${config.owner}/${config.repo}`, 'success');
    } catch (error: any) {
      addLog('Orchestrator', `Failed to fetch issues: ${error.message}`, 'error');
    } finally {
      setIsLoadingIssues(false);
    }
  };

  const runAutomation = async (issue: GitHubIssue) => {
    if (!githubService.current) return;
    
    setState(prev => ({
      ...prev,
      status: 'INIT',
      currentIssue: issue,
      logs: [],
      retryCount: 0
    }));

    addLog('Orchestrator', `Starting automation for issue #${issue.number}: ${issue.title}`);

    try {
      // 1. Planner
      setState(prev => ({ ...prev, status: 'PLANNED' }));
      addLog('Planner', 'Analyzing issue and creating execution plan...');
      const plan = await agentService.current.plan(issue);
      addLog('Planner', 'Plan generated successfully', 'success', plan);

      // 2. Coder
      setState(prev => ({ ...prev, status: 'CODE_GENERATED' }));
      addLog('Coder', 'Fetching relevant files and generating code changes...');
      const fileContents: Record<string, string> = {};
      for (const file of plan.files) {
        try {
          fileContents[file] = await githubService.current.getFileContent(file);
        } catch (e) {
          addLog('Coder', `Warning: Could not fetch ${file}, assuming new file`, 'warning');
          fileContents[file] = '';
        }
      }
      const codeResult = await agentService.current.code(plan, fileContents);
      addLog('Coder', 'Code changes generated', 'success', codeResult);

      // 3. Tester (Simulated)
      addLog('Tester', 'Running test suite...');
      await new Promise(r => setTimeout(r, 1500));
      const testPassed = Math.random() > 0.2; // Simulate some failures
      
      if (!testPassed) {
        setState(prev => ({ ...prev, status: 'TEST_FAILED' }));
        addLog('Tester', 'Tests failed!', 'error');
        
        // 4. Debugger
        setState(prev => ({ ...prev, status: 'DEBUGGING' }));
        addLog('Debugger', 'Analyzing error logs and fixing code...');
        const debugResult = await agentService.current.debug("AssertionError: Expected true to be false", JSON.stringify(codeResult.updated_files));
        addLog('Debugger', 'Applied fix', 'success', debugResult);
      }

      setState(prev => ({ ...prev, status: 'TEST_PASSED' }));
      addLog('Tester', 'All tests passed', 'success');

      // 5. Reviewer
      setState(prev => ({ ...prev, status: 'REVIEWED' }));
      addLog('Reviewer', 'Performing final code quality review...');
      const reviewResult = await agentService.current.review(plan, fileContents, codeResult.updated_files);
      
      if (reviewResult.decision === 'REJECT') {
        addLog('Reviewer', `Review rejected: ${reviewResult.reason}`, 'error');
        setState(prev => ({ ...prev, status: 'FAILED' }));
        return;
      }
      addLog('Reviewer', 'Review approved', 'success');

      // 6. PR Creator
      setState(prev => ({ ...prev, status: 'PR_CREATED' }));
      addLog('Orchestrator', 'Creating Pull Request on GitHub...');
      // In a real app, we would push a branch first. Here we simulate the final step.
      addLog('Orchestrator', 'Automation completed successfully! PR #123 created.', 'success');

    } catch (error: any) {
      addLog('Orchestrator', `Automation failed: ${error.message}`, 'error');
      setState(prev => ({ ...prev, status: 'FAILED' }));
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Header */}
      <header className="border-b border-line p-6 flex items-center justify-between bg-bg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ink text-bg flex items-center justify-center rounded-sm">
            <Github size={24} />
          </div>
          <div>
            <h1 className="font-serif italic text-2xl leading-none">GitHub Agentic Automation</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1">Multi-Agent Orchestration System v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="p-2 hover:bg-ink hover:text-bg transition-colors border border-line"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={fetchIssues}
            disabled={isLoadingIssues}
            className="px-6 py-2 bg-ink text-bg font-mono text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {isLoadingIssues ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            FETCH_ISSUES
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] overflow-hidden">
        {/* Left Column: Issues & Active Task */}
        <div className="border-r border-line overflow-y-auto flex flex-col">
          {/* Config Panel */}
          <AnimatePresence>
            {isConfigOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-line bg-ink/5 overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="col-header">GitHub Token</label>
                    <input 
                      type="password" 
                      value={config.token}
                      onChange={e => setConfig(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="ghp_..."
                      className="w-full bg-transparent border border-line p-2 font-mono text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="col-header">Owner</label>
                    <input 
                      type="text" 
                      value={config.owner}
                      onChange={e => setConfig(prev => ({ ...prev, owner: e.target.value }))}
                      placeholder="e.g. facebook"
                      className="w-full bg-transparent border border-line p-2 font-mono text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="col-header">Repository</label>
                    <input 
                      type="text" 
                      value={config.repo}
                      onChange={e => setConfig(prev => ({ ...prev, repo: e.target.value }))}
                      placeholder="e.g. react"
                      className="w-full bg-transparent border border-line p-2 font-mono text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Issue Status */}
          {state.currentIssue && (
            <div className="p-8 border-b border-line bg-ink text-bg">
              <div className="flex items-center justify-between mb-4">
                <span className="col-header text-bg opacity-70">Active Automation Task</span>
                <span className={cn(
                  "px-2 py-1 text-[10px] font-mono border",
                  state.status === 'FAILED' ? "border-red-500 text-red-500" : "border-emerald-500 text-emerald-500"
                )}>
                  {state.status}
                </span>
              </div>
              <h2 className="font-serif italic text-3xl mb-2">#{state.currentIssue.number} {state.currentIssue.title}</h2>
              <div className="flex gap-6 mt-6">
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className={cn("w-8 h-8 border border-bg flex items-center justify-center", state.status !== 'INIT' && "bg-bg text-ink opacity-100")}>
                    <ListTodo size={16} />
                  </div>
                  <span className="text-[8px] uppercase tracking-tighter">Plan</span>
                </div>
                <div className="w-8 h-[1px] bg-bg/20 self-center" />
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className={cn("w-8 h-8 border border-bg flex items-center justify-center", ['CODE_GENERATED', 'TEST_FAILED', 'DEBUGGING', 'TEST_PASSED', 'REVIEWED', 'PR_CREATED'].includes(state.status) && "bg-bg text-ink opacity-100")}>
                    <Code2 size={16} />
                  </div>
                  <span className="text-[8px] uppercase tracking-tighter">Code</span>
                </div>
                <div className="w-8 h-[1px] bg-bg/20 self-center" />
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className={cn("w-8 h-8 border border-bg flex items-center justify-center", ['TEST_PASSED', 'REVIEWED', 'PR_CREATED'].includes(state.status) && "bg-bg text-ink opacity-100")}>
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-[8px] uppercase tracking-tighter">Test</span>
                </div>
                <div className="w-8 h-[1px] bg-bg/20 self-center" />
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <div className={cn("w-8 h-8 border border-bg flex items-center justify-center", ['PR_CREATED'].includes(state.status) && "bg-bg text-ink opacity-100")}>
                    <GitPullRequest size={16} />
                  </div>
                  <span className="text-[8px] uppercase tracking-tighter">PR</span>
                </div>
              </div>
            </div>
          )}

          {/* Issues List */}
          <div className="flex-1">
            <div className="data-row bg-ink/5 sticky top-0 z-[5]">
              <span className="col-header">ID</span>
              <span className="col-header">Issue Title</span>
              <span className="col-header">Author</span>
              <span className="col-header">Action</span>
            </div>
            {issues.length === 0 && !isLoadingIssues && (
              <div className="p-20 text-center opacity-30 italic font-serif">
                No issues loaded. Configure repository and fetch.
              </div>
            )}
            {issues.map(issue => (
              <div 
                key={issue.id} 
                className={cn(
                  "data-row",
                  state.currentIssue?.id === issue.id && "bg-ink text-bg"
                )}
                onClick={() => runAutomation(issue)}
              >
                <span className="data-value">#{issue.number}</span>
                <span className="truncate pr-4">{issue.title}</span>
                <span className="opacity-60 text-xs self-center">@{issue.user.login}</span>
                <span className="flex items-center gap-2">
                  <ChevronRight size={14} />
                  <span className="text-[10px] uppercase font-mono">Run Agent</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Agent Logs */}
        <div className="bg-ink text-bg flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={16} />
              <span className="col-header text-bg opacity-100">Agent Execution Logs</span>
            </div>
            <span className="text-[10px] font-mono opacity-50">LIVE_FEED</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-3">
            {state.logs.length === 0 && (
              <div className="opacity-20 italic">Waiting for process initiation...</div>
            )}
            {state.logs.map(log => (
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                key={log.id} 
                className="space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="opacity-30">[{log.timestamp}]</span>
                  <span className={cn(
                    "px-1 rounded-sm",
                    log.agent === 'Orchestrator' ? "bg-blue-500/20 text-blue-400" :
                    log.agent === 'Planner' ? "bg-purple-500/20 text-purple-400" :
                    log.agent === 'Coder' ? "bg-emerald-500/20 text-emerald-400" :
                    log.agent === 'Tester' ? "bg-amber-500/20 text-amber-400" :
                    log.agent === 'Debugger' ? "bg-red-500/20 text-red-400" :
                    "bg-zinc-500/20 text-zinc-400"
                  )}>
                    {log.agent}
                  </span>
                  {log.type === 'success' && <CheckCircle2 size={10} className="text-emerald-500" />}
                  {log.type === 'error' && <AlertCircle size={10} className="text-red-500" />}
                  {log.type === 'warning' && <Bug size={10} className="text-amber-500" />}
                </div>
                <p className={cn(
                  "pl-4 border-l border-white/10 ml-2",
                  log.type === 'error' ? "text-red-400" : 
                  log.type === 'success' ? "text-emerald-400" : 
                  "text-white/70"
                )}>
                  {log.message}
                </p>
                {log.data && (
                  <pre className="ml-6 p-2 bg-white/5 rounded-sm text-[9px] overflow-x-auto max-w-full">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-line p-2 px-4 flex items-center justify-between text-[10px] font-mono opacity-50">
        <div className="flex gap-4">
          <span>SYSTEM: ONLINE</span>
          <span>AGENTS: 6_ACTIVE</span>
          <span>LATENCY: 42MS</span>
        </div>
        <div>
          © 2026 MULTI-AGENT-SYSTEM-V1
        </div>
      </footer>
    </div>
  );
}
