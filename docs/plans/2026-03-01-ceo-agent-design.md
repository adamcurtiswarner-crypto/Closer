# CEO Agent — Master Orchestrator Design

*Date: 2026-03-01*
*Status: Approved*

## Overview

A hierarchical agent system where a single CEO agent orchestrates 7 department heads, who in turn manage 35 specialist agents. The CEO owns all strategic decisions, delegates tactically through department heads, and maintains persistent state in `STUDIO-STATUS.md`.

## Architecture

```
CEO Agent (ceo.md)
├── Engineering Lead → frontend-developer, backend-architect, mobile-app-builder, ai-engineer, devops-automator, rapid-prototyper
├── Product Lead → trend-researcher, feedback-synthesizer, sprint-prioritizer
├── Marketing Lead → tiktok-strategist, instagram-curator, twitter-engager, reddit-community-builder, app-store-optimizer, content-creator, growth-hacker
├── Design Lead → ui-designer, ux-researcher, brand-guardian, visual-storyteller, whimsy-injector
├── Project Management Lead → experiment-tracker, project-shipper, studio-producer
├── Operations Lead → support-responder, analytics-reporter, infrastructure-maintainer, legal-compliance-checker, finance-tracker
└── Testing Lead → tool-evaluator, api-tester, workflow-optimizer, performance-benchmarker, test-results-analyzer
```

## CEO Agent Identity

- Role: CEO of Stoke Studio
- Reports to: Adam (founder/board)
- Autonomy: Execute and report — makes decisions autonomously, surfaces results
- Core loop: Read status → decide → delegate → synthesize → update status → report

## Persistent State: STUDIO-STATUS.md

Single markdown file the CEO reads at start and updates at end of every invocation. Contains:
- Current sprint focus and goal
- Active initiatives table (initiative, department, status, owner agent, blockers)
- Key metrics snapshot (DAU couples, prompt response rate, MRR, App Store rating)
- Decisions made this session (timestamped log)
- Blockers and risks
- Prioritized next actions

Only the CEO writes to this file. Department heads report verbally; the CEO synthesizes.

## Department Heads

7 agent files in `.claude/agents/heads/`. Each follows a common template:
- Identity: department lead reporting to CEO
- Team roster: which IC agents they manage, with file paths
- Responsibilities: break down CEO directives, assign to ICs, report results
- Domain knowledge: relevant frameworks, constraints, and standards
- Report format: structured output (what was done, what's blocked, what's next)

## Invocation

Slash command `/ceo` via `.claude/commands/ceo.md`.

Usage patterns:
- `/ceo` — status check, what's next
- `/ceo weekly review` — full cross-department review
- `/ceo ship widgets` — plan and delegate a feature across departments
- `/ceo marketing push` — direct a specific department
- `/ceo what's blocked?` — identify and unblock stalled work

## Delegation Flow

1. CEO reads STUDIO-STATUS.md
2. Interprets request (defaults to "what's next?" with no args)
3. Decides which department heads to consult
4. Spawns department heads as subagents
5. Department heads return structured reports referencing IC agents
6. CEO synthesizes into executive summary
7. Updates STUDIO-STATUS.md
8. Reports to Adam

Constraint: subagents are one level deep. Department heads can't spawn IC agents as sub-subagents. Instead, they return instructions referencing which IC agent prompts to use for execution.

## File Inventory

| # | File | Purpose |
|---|------|---------|
| 1 | `.claude/agents/ceo.md` | CEO agent system prompt |
| 2 | `.claude/agents/heads/engineering-lead.md` | Engineering department head |
| 3 | `.claude/agents/heads/product-lead.md` | Product department head |
| 4 | `.claude/agents/heads/marketing-lead.md` | Marketing department head |
| 5 | `.claude/agents/heads/design-lead.md` | Design department head |
| 6 | `.claude/agents/heads/project-management-lead.md` | Project management department head |
| 7 | `.claude/agents/heads/operations-lead.md` | Operations department head |
| 8 | `.claude/agents/heads/testing-lead.md` | Testing department head |
| 9 | `.claude/commands/ceo.md` | Slash command entry point |
| 10 | `STUDIO-STATUS.md` | Persistent state file |

No existing files are modified. All 35 existing agent files remain untouched.
