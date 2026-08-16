# Lab 1 — AI Use and Reflection

**LLM/agent used:** Claude (Claude.ai chat), used alongside Antigravity IDE
(VS Code–based editor) for editing and running files locally.

## Selected key prompts (6–10)

| # | Prompt (summarised) | What I did with the result | Reflection |
|---|---|---|---|
| 1 | Translate and explain the labsheet's Git Flow instructions (main / lab1-staging / feature branches) before starting anything | Followed the explanation to create the repo and the three base branches in the correct order | Worked in one shot — having the exact labsheet section pasted in gave precise context |
| 2 | Uploaded the starter scaffold zip and asked Claude to review it and summarize the four Issues, required branches, and acceptance criteria | Used the summary as my checklist for the whole lab instead of re-reading the PDF each time | Very useful early on, saved time going back and forth to the labsheet |
| 3 | Asked for a full step-by-step walkthrough of Issue 1 (environment setup) with reasons for each command, not just commands to copy | Followed it to install dependencies, start Postgres in Docker, and get client/server both running | Had to follow up with several debugging prompts — the first attempt hit a Prisma authentication error that wasn't in the original plan |
| 4 | Pasted the raw `P1000 Authentication failed` error from `npx prisma db pull` and asked for help diagnosing it | Followed the suggested checks (env var conflicts, container credentials, port conflicts) until the real cause was found — a Docker port clash on 5432 | Took several rounds; the first two suggested causes were ruled out before the actual one (port conflict, fixed by mapping to 5433) was found |
| 5 | For each Issue (2, 3, 4), asked for the exact code changes needed file-by-file to satisfy that Issue's acceptance criteria | Applied the given diffs to `app.ts`, `api.ts`, `App.tsx`, and the test files, then ran the tests myself | Worked in one shot each time — but I still ran and read the test output myself rather than assuming it would pass |
| 6 | Asked, for each Issue, "how do I check every acceptance-criteria line is actually satisfied?" | Got a checklist mapping every acceptance-criteria line to a concrete test command, browser check, or SQL query, and ran each one manually | Useful because it forced me to verify claims instead of trusting that the code "looked right" |
| 7 | Uploaded the supplementary GitHub Workflow Guide PDF and asked why typing `Resolve #18` in a PR wasn't linking it to the Issue | Learned that PRs merging into a non-default branch (`lab1-staging`) don't get keyword-linked, and had to link every PR manually via the Development panel | This corrected a misunderstanding I already had — I assumed the keyword alone was enough, and had gone back and re-linked four already-open PRs |
| 8 | Uploaded the instructor's clarification memo and asked Claude to revise the remaining merge/docs plan against it | Adjusted the plan to finish `/docs` files before Issue 4's PR gets approved, instead of using a separate docs branch, since Issues 1-4 weren't all finished yet | Good catch on my part to check the memo before blindly following the earlier plan Claude gave me — the two rules didn't fully agree |
| 9 | After an accidental "Revert" click undid part of a merged PR, described the symptom ("มันเกิดไรขึ้นงง") and asked what happened | Diagnosed it as a GitHub Revert action, then checked (myself, in the repo) which files were actually affected before accepting the explanation | I didn't just accept the first answer — I asked Claude to help me verify in the actual repo files whether the app code (not just the README) was affected, which turned out to be fine |

## Reflection
ใช้claudeในการถามคําสั่งต่างๆ รวมถึงให้มันสอนการใช้github ใช้generate prompt ได้ใช้สไลด์ในห้องเรียนทําให้promotได้ดีขึ้น ว่าไม่าต้อง hardcode
อย่างสุดท้าบใช่claudeช่วยสรุปdocumentทั้งหมด