
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="PayAgent External API Bridge")

# Global state to sync between Terminal and Browser
chaos_state = {
    "bank": None,
    "active": False,
    "level": 0.0
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoutingPolicy(BaseModel):
    bank: str
    method: str
    new_weight: float

class ChaosTrigger(BaseModel):
    bank: str
    active: bool
    level: float = 0.9

@app.post("/api/trigger_chaos")
async def trigger_chaos(payload: ChaosTrigger):
    global chaos_state
    chaos_state["bank"] = payload.bank
    chaos_state["active"] = payload.active
    chaos_state["level"] = payload.level if payload.active else 0.0
    status = "ACTIVATED" if payload.active else "DEACTIVATED"
    print(f"\n[!!!] EXTERNAL CHAOS {status}: Target={payload.bank} Level={chaos_state['level']}")
    return {"status": "success", "chaos": chaos_state}

@app.get("/api/chaos_status")
async def get_chaos():
    return chaos_state

@app.post("/api/routing")
async def update_routing(policy: RoutingPolicy):
    # This is what the AI calls to "Fix" the problem
    print(f"\n[AI_COMMAND] Received Reroute Request -> {policy.bank}:{policy.method} weight set to {policy.new_weight}")
    # Reset chaos if AI successfully reroutes away from the failing bank
    global chaos_state
    if policy.bank == chaos_state["bank"] and policy.new_weight == 0:
        print(f"[SYSTEM] AI successfully mitigated failure on {policy.bank}. Clearing external chaos flag.")
        chaos_state["active"] = False
    return {"status": "success", "action": "applied"}

@app.get("/api/health")
async def health():
    return {"status": "online", "bridge": "active"}

if __name__ == "__main__":
    print("PayAgent Bridge started on http://localhost:8000")
    print("To trigger a failure from Command Prompt, run:")
    print("curl -X POST http://localhost:8000/api/trigger_chaos -H 'Content-Type: application/json' -d '{\"bank\": \"HDFC\", \"active\": true}'")
    uvicorn.run(app, host="0.0.0.0", port=8000)
