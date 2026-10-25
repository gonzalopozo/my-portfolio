---
name: git-worktree-task
description: Use this skill when an AI agent needs to work on a Git project using an isolated Git worktree. The agent must create the worktree and branch automatically based on the user prompt, work only inside that worktree, and never commit unless the user explicitly asks for a commit.
---

# Git Worktree Task Skill

## Objective

You are an AI agent working on a Git project.

For every implementation task, you must create and use an isolated Git worktree.

The user should not have to manually create the worktree or branch.

You are responsible for:

1. Inspecting the current repository.
2. Choosing a task branch name based on the user prompt.
3. Creating the Git worktree.
4. Moving into that worktree.
5. Implementing the requested changes there.
6. Running relevant checks.
7. Reporting what changed.

You must not commit unless the user explicitly asks you to commit.

## Core Rule

One task = one branch = one worktree = one agent session.

A terminal is not an isolated workspace.

A Git worktree is an isolated workspace.

Never do implementation work directly in the main repository folder unless the user explicitly tells you to ignore this workflow.

## Default Behavior

When the user asks for a coding task, assume this workflow:

1. Start from the current Git repository.
2. Detect the current branch.
3. Use the current branch as the base branch unless the user specifies another base branch.
4. Create a new branch and worktree for the task.
5. Work inside the new worktree.
6. Do not commit unless explicitly asked.

## First Commands To Run

Before doing anything, run:

```bash
pwd
git rev-parse --show-toplevel
git status --short
git branch --show-current
git worktree list
```

Use these commands to identify:

1. The repository root.
2. The current branch.
3. Whether the working tree is clean.
4. Existing worktrees.
5. Whether you are already inside a worktree.

## Dirty Working Tree Rule

If the current repository has uncommitted changes, do not ignore them.

Run:

```bash
git status
```

Then decide:

1. If the changes are unrelated and the user did not ask you to touch them, do not modify them.
2. If the changes are in the main repository folder, still create the new worktree from the current `HEAD`, but clearly tell the user that uncommitted changes from the original folder are not included in the new worktree.
3. Never stash, reset, clean, or discard user changes unless the user explicitly asks.

Forbidden unless explicitly requested:

```bash
git stash
git reset --hard
git clean -fd
git checkout .
git restore .
```

## Task Naming

You must generate the branch and worktree name from the user prompt.

Use a short kebab-case slug.

Rules:

1. Use English.
2. Use lowercase.
3. Use hyphens between words.
4. Remove punctuation.
5. Keep it short but meaningful.
6. Prefer 2 to 5 words.
7. Prefix the branch with `agent/`.

Examples:

User prompt:

```text
Fix the navbar mobile layout
```

Use:

```bash
agent/fix-mobile-navbar
```

Worktree folder:

```bash
../<project-name>-agent-fix-mobile-navbar
```

User prompt:

```text
Add Spotify current song widget
```

Use:

```bash
agent/add-spotify-widget
```

Worktree folder:

```bash
../<project-name>-agent-add-spotify-widget
```

User prompt:

```text
Refactor project cards and improve responsive spacing
```

Use:

```bash
agent/refactor-project-cards
```

Worktree folder:

```bash
../<project-name>-agent-refactor-project-cards
```

## Name Collision Rule

Before creating the worktree, check existing branches and worktrees:

```bash
git branch --list "agent/<task-name>"
git worktree list
```

If the branch or folder already exists, append a number:

```bash
agent/fix-mobile-navbar-2
../<project-name>-agent-fix-mobile-navbar-2
```

If needed:

```bash
agent/fix-mobile-navbar-3
../<project-name>-agent-fix-mobile-navbar-3
```

Do not overwrite existing worktrees.

Do not delete existing worktrees.

Do not delete existing branches.

## Creating The Worktree

From the repository root, create the worktree like this:

```bash
git worktree add -b agent/<task-name> ../<project-name>-agent-<task-name> <base-branch>
```

Example:

```bash
git worktree add -b agent/fix-mobile-navbar ../my-project-agent-fix-mobile-navbar main
```

If the current branch is `restructure`, use:

```bash
git worktree add -b agent/fix-mobile-navbar ../my-project-agent-fix-mobile-navbar restructure
```

If the base branch is the current branch, use that current branch.

Do not switch branches in the original repository unless the user explicitly asks.

## After Creating The Worktree

Immediately move into the new worktree:

```bash
cd ../<project-name>-agent-<task-name>
```

Then verify:

```bash
pwd
git status
git branch --show-current
```

The current branch must be:

```bash
agent/<task-name>
```

Only start editing files after this verification.

## What The Agent May Do

The agent may:

1. Create the worktree.
2. Create the task branch.
3. Move into the worktree.
4. Read files.
5. Edit files.
6. Create files.
7. Delete files only if required by the task.
8. Run project checks.
9. Run tests.
10. Report modified files.
11. Prepare changes for review.

## What The Agent Must Not Do Unless Explicitly Asked

Do not run:

```bash
git commit
git merge
git rebase
git push
git push --force
git branch -d
git branch -D
git worktree remove
git reset --hard
git clean -fd
git stash
```

Do not commit by default.

Do not merge by default.

Do not push by default.

Do not clean up the worktree by default.

Do not delete the branch by default.

Do not rewrite history.

## Commit Rule

You must only commit if the user explicitly asks for a commit.

Examples where committing is allowed:

```text
commit the changes
make a commit
commit this
haz commit
haz commits
commitea esto
create a commit
```

Examples where committing is not allowed:

```text
fix this
implement this
refactor this
add this feature
make this work
```

If the user did not explicitly ask for a commit, leave the changes uncommitted.

At the end, report:

```bash
git status --short
git diff --stat
```

Tell the user that the changes are ready for review but not committed.

## If The User Explicitly Asks For Commits

Before committing, run:

```bash
git status
git diff --stat
```

Then create a clear commit:

```bash
git add .
git commit -m "<clear commit message>"
```

Commit message rules:

1. Use English.
2. Be specific.
3. Describe the actual change.
4. Avoid vague messages.

Good:

```bash
git commit -m "Fix mobile navbar layout"
git commit -m "Add Spotify status widget"
git commit -m "Refactor project card spacing"
```

Bad:

```bash
git commit -m "fix"
git commit -m "changes"
git commit -m "wip"
git commit -m "stuff"
```

If the task naturally has several independent parts and the user asked for commits, create multiple coherent commits.

If the user only asked for one commit, create one commit.

## Working Process

After entering the worktree:

1. Understand the user prompt.
2. Inspect relevant files.
3. Make focused changes.
4. Avoid unrelated refactors.
5. Avoid touching unrelated files.
6. Run relevant checks.
7. Report results.
8. Do not commit unless explicitly asked.

Do not reformat the whole project unless requested.

Do not introduce new dependencies unless necessary.

If a new dependency is necessary, explain why before adding it.

## Validation

For a Next.js / TypeScript project, prefer:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

If tests exist:

```bash
pnpm test
```

If the project uses another package manager, adapt:

```bash
npm run lint
npm run typecheck
npm run build
```

or:

```bash
yarn lint
yarn typecheck
yarn build
```

or:

```bash
bun run lint
bun run typecheck
bun run build
```

Do not pretend checks passed if they failed.

If a command fails, report:

1. The failed command.
2. The relevant error.
3. Whether it seems caused by your changes.
4. Whether you fixed it.
5. What remains broken.

## Files Not To Commit

Even when committing is explicitly requested, never commit these unless the user explicitly asks:

```text
node_modules/
.next/
dist/
build/
coverage/
.env
.env.local
.env.production
.DS_Store
```

Never commit secrets.

Never commit local machine config.

Never commit temporary debug files.

Never commit generated output unless the project intentionally tracks it.

## Final Response Format

At the end of the task, report clearly:

```text
Worktree created:
<path>

Branch:
agent/<task-name>

Base branch:
<base-branch>

Changes made:
- <change 1>
- <change 2>
- <change 3>

Checks run:
- <command>: passed/failed
- <command>: passed/failed

Git status:
<short status summary>

Commit status:
No commit was created because the user did not explicitly ask for one.
```

If the user explicitly asked for commits, report:

```text
Commits created:
- <commit hash> <commit message>
```

## Human Merge Workflow

After reviewing the worktree, the human may merge manually from the main repository folder.

Using `main`:

```bash
cd ~/dev/<project-name>
git switch main
git pull --ff-only
git merge --no-ff agent/<task-name>
```

Using `restructure`:

```bash
cd ~/dev/<project-name>
git switch restructure
git pull --ff-only
git merge --no-ff agent/<task-name>
```

Do not use squash merge unless the user specifically asks.

The intended merge style is:

```bash
git merge --no-ff agent/<task-name>
```

This preserves task commits if commits exist.

If no commits exist yet, the human must commit inside the worktree before merging.

## Human Cleanup Workflow

After merging, the human may clean up manually:

```bash
git worktree remove ../<project-name>-agent-<task-name>
git branch -d agent/<task-name>
```

The agent must not perform cleanup unless explicitly asked.

## Final Non-Negotiables

1. The agent creates the worktree.
2. The agent chooses the branch and worktree name from the prompt.
3. The agent works only inside the created worktree.
4. The agent does not commit unless explicitly asked.
5. The agent does not merge unless explicitly asked.
6. The agent does not push unless explicitly asked.
7. The agent does not delete branches unless explicitly asked.
8. The agent does not remove worktrees unless explicitly asked.
9. The agent does not rewrite history.
10. The human reviews and decides when to commit, merge, push, or clean up.
