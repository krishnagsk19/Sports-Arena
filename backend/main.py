import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Sports Arena API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get absolute directory path of this file to securely locate the data folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_json_data(sport: str, role: str):
    file_path = os.path.join(BASE_DIR, "data", f"{sport}_{role}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Data file not found: {sport}_{role}.json")
    
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/api/compare/{sport}/{role}")
def get_comparison_data(sport: str, role: str, players: str = None):
    data = load_json_data(sport, role)
    
    if not players:
        return data
    
    player_ids = players.split(",")
    filtered_players = [p for p in data["players"] if p["id"] in player_ids]
    
    return {
        "sport": data["sport"],
        "role": data["role"],
        "metrics": data["metrics"],
        "players": filtered_players
    }