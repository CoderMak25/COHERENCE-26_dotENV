# OutreachOS

AI-powered sales outreach automation platform built with the MERN stack.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Iconify
- **Backend**: Node.js, Express, MongoDB (Mongoose), Redis, Bull
- **AI**: OpenAI GPT-4o for personalized message generation
- **Email**: Nodemailer with SMTP

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for MongoDB & Redis)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

### 2. Configure Environment

```bash
cp .env.example server/.env
```

Edit `server/.env` with your actual credentials.

### 3. Install & Start Backend

```bash
cd server
npm install
npm run dev
```

### 4. Install & Start Frontend

```bash
cd client
npm install
npm run dev
```

### 5. Open Browser

Navigate to [http://localhost:5173](http://localhost:5173)

## Project Structure

```
outreachos/
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── docker-compose.yml
├── .env.example
└── README.md
```

## Features

- **Lead Management**: Import, search, filter, and manage leads
- **Workflow Builder**: Visual drag-and-drop workflow canvas
- **AI Message Generation**: GPT-4o powered personalized outreach
- **Campaign Execution**: Automated email sequences with throttling
- **Real-time Logs**: Live feed of all outreach activity
- **Theme Toggle**: Dark/Light mode with persistence
