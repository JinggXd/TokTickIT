# TokTickIT 
# TokTickIT (ตอกติ๊กกิต)

IT Service Desk application — full-stack vertical slice built for CPE334 Lab 1.

## Sprint 1 Goal
React UI → Express REST API → Prisma ORM → PostgreSQL DB
A basic app showing backend health status and the 4 supported IT request categories.

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Bootstrap
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL + Prisma
- **Testing:** Vitest + Supertest

## Prerequisites
- Node.js (v18+)
- Docker (for running PostgreSQL locally)

## First-Time Setup

### 1. Start PostgreSQL (via Docker)
```bash
docker run --name toktickit-db \
  -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit \
  -p 5432:5432 -d postgres:16
```
> If port 5432 is already in use, map to another port instead (e.g. `-p 5433:5432`) and update `DATABASE_URL` in `.env` accordingly.

### 2. Backend setup
```bash
cd server
cp .env.example .env    # adjust DATABASE_URL/PORT if needed
npm install
npx prisma generate
```

### 3. Frontend setup
```bash
cd client
cp .env.example .env
npm install
```

## Running the App

Run these two in **separate terminals**, each time you want to start working:

**Terminal 1 — Backend**
```bash
cd server
npm run dev
```
→ runs at `http://localhost:3000`

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```
→ runs at `http://localhost:5173`

> If you previously shut down your machine, restart the database container first (no need to `docker run` again):
> ```bash
> docker start toktickit-db
> ```

## Running Tests
```bash
cd server && npx vitest run
cd client && npx vitest run
```

## Project Structure
```
toktickit/
├── client/          # React + Vite frontend
├── server/          # Express + Prisma backend
├── docs/lab-01/      # Lab deliverables (ai_use.md, reviewer.md, tests.md)
└── .gitignore
```