# ConvoPilot

A full-stack customer support platform — real-time chat, multi-agent inbox, AI copilot, and live sentiment scoring.

![Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20PostgreSQL%20%7C%20Redis%20%7C%20Socket.IO-6366f1)
![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude%20%7C%20OpenAI-10b981)
![Infra](https://img.shields.io/badge/infra-AWS%20EC2%20%2B%20S3%20%2B%20CloudFront-f59e0b)

---

## What it does

| Feature | Description |
|---|---|
| **Real-time chat** | WebSocket-powered messaging between customers and agents |
| **Multi-agent inbox** | All / Mine / Unassigned views with smart assignment |
| **Live sentiment scoring** | AI scores every conversation 0–100, updates live without refresh |
| **Agent coaching** | Coaching nudges pushed to agents when a customer is frustrated |
| **AI Copilot** | Suggest reply, summarize conversation, improve tone |
| **Auto-tagging** | Incoming messages tagged automatically (billing, bug, urgent…) |
| **Self-assign** | Agents can claim unassigned tickets with one click |
| **Audit log** | Every action tracked — status changes, assignments, messages |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Browser                                             │
│  React + Zustand + Socket.IO client                  │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP / WebSocket
┌──────────────────▼───────────────────────────────────┐
│  Node.js API  (Express + Socket.IO)                  │
│  REST endpoints · real-time events · Redis pub/sub   │
└──────┬───────────────┬───────────────┬───────────────┘
       │               │               │
  ┌────▼────┐    ┌─────▼─────┐  ┌──────▼──────┐
  │Postgres │    │   Redis   │  │ AI Service  │
  │         │    │(pub/sub + │  │  (Python /  │
  │         │    │msg counts)│  │   FastAPI)  │
  └─────────┘    └───────────┘  └─────────────┘
```

**Frontend** → S3 + CloudFront  
**Backend + AI + DB + Redis** → single EC2 instance via Docker Compose

---

## The Sentiment Engine

The standout feature. After every 5th customer message:

1. Last 5 messages are sent to the AI (not the whole history — intentional, keeps costs low and signal clean)
2. AI returns a score **0–100** across 7 emotional bands
3. Score is saved to DB and **broadcast via WebSocket** to all agents in real time
4. UI updates the sentiment bar without any page reload
5. If score < 45 (frustrated), a coaching nudge is pushed to the agent live

```
0──────15──────30──────44──────55──────69──────84──────100
😡 Very   😠          😟        😐        🙂        😊       😄
frustrated                  neutral                    very happy
```

Redis tracks the message counter per conversation — sentiment only runs on message `1` and every `5th` thereafter.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Zustand, Tailwind CSS, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, Redis pub/sub |
| Database | PostgreSQL (pgcrypto UUIDs, full audit log table) |
| Cache / bus | Redis |
| AI microservice | Python, FastAPI — pluggable: Gemini / Claude / OpenAI |
| Infrastructure | AWS EC2 t3.small + S3 + CloudFront — CloudFormation template included |
| Containers | Docker + Docker Compose |

---

## Local Setup

**Prerequisites:** Docker, Node.js 20+, Python 3.11+

```bash
git clone https://github.com/yourusername/ConvoPilot.git
cd ConvoPilot

cp .env.example .env
# Edit .env — add your AI provider key (Gemini free tier works fine)

docker compose up --build

# In another terminal:
docker compose exec backend node src/migrations/migrate.js
docker compose exec backend node src/migrations/seed.js
```

| URL | What |
|---|---|
| `http://localhost` | Customer chat |
| `http://localhost/agent-login` | Agent login / signup |

Create an agent account, open the customer chat in a separate tab, send messages, watch sentiment update live.

---

## Deployment (AWS)

A CloudFormation template is included in `infra/cloudformation.yml` — creates EC2 + Elastic IP + S3 + CloudFront in one command.

```bash
aws cloudformation create-stack \
  --stack-name convopilot-demo \
  --region eu-central-1 \
  --template-body file://infra/cloudformation.yml \
  --capabilities CAPABILITY_IAM \
  --parameters \
    ParameterKey=KeyPairName,ParameterValue=your-keypair \
    ParameterKey=GitRepoURL,ParameterValue=https://github.com/you/ConvoPilot.git \
    ParameterKey=DBPassword,ParameterValue=StrongPassword123 \
    ParameterKey=RedisPassword,ParameterValue=StrongPassword456 \
    ParameterKey=AIProvider,ParameterValue=gemini \
    ParameterKey=AIApiKey,ParameterValue=your_api_key \
    ParameterKey=AIModel,ParameterValue=gemini-2.0-flash
```

After the stack is up, build and upload the frontend:

```bash
cd frontend
VITE_API_URL=http://<ElasticIP>/api VITE_SOCKET_URL=http://<ElasticIP> npm run build
aws s3 sync dist/ s3://<FrontendBucketName>/ --region eu-central-1 --delete
```

---

## Project Structure

```
ConvoPilot/
├── frontend/              # React app (Vite)
│   └── src/
│       ├── components/    # Agent dashboard, customer chat UI
│       ├── hooks/         # useConversation, useSocket, useAI
│       ├── store/         # Zustand stores
│       └── services/      # API + socket clients
│
├── backend/               # Node.js API
│   └── src/
│       ├── controllers/
│       ├── services/      # Business logic, AI jobs, assignment
│       ├── repositories/  # All DB queries
│       ├── sockets/       # Socket.IO handlers + Redis pub/sub
│       └── migrations/    # SQL migrations + seed data
│
├── ai-service/            # Python FastAPI microservice
│   └── src/
│       ├── providers/     # Gemini / Claude / OpenAI adapters
│       └── services/      # Sentiment, reply suggestion, summarize
│
└── infra/
    └── cloudformation.yml # Full AWS stack definition
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in your values. **Never commit `.env`.**

See `.env.example` for all available options with descriptions.

---

## Author

**Surya Thakur**  
[suryapratap1515@gmail.com](mailto:suryapratap1515@gmail.com)

---

## License

MIT License

Copyright (c) 2025 Surya Thakur

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
