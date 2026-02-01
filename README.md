# Agentic AI Real-time Transaction and Payment System

This project implements an agentic AI system for real-time transaction and payment processing. It includes a React frontend, FastAPI backend, and AI agents for handling payment simulations, clustering, and orchestration.

## Features

- Real-time transaction monitoring
- AI-powered payment routing and chaos simulation
- Agent orchestration for automated decision-making
- Interactive terminal for agent interactions
- Metrics dashboard for performance tracking

## Prerequisites

- Node.js (for frontend)
- Python 3.8+ (for backend)
- Gemini API key

## Run Locally

1. Install frontend dependencies:
   `npm install`

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. Run the frontend:
   `npm run dev`

4. For the backend, run the FastAPI server:
   `python main.py`

## API Endpoints

- `POST /api/trigger_chaos`: Trigger chaos in payment routing
- `GET /api/chaos_status`: Get current chaos status
- `POST /api/routing`: Update routing policies
- `GET /api/health`: Health check

## Project Structure

- `components/`: React components
- `services/`: AI agents and services
- `main.py`: FastAPI backend
- `App.tsx`: Main React app
