from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import json
import os

app = FastAPI(title="Sports Arena API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def load_sport_data(sport: str, role: str):
    file_name = f"{sport.lower()}_{role.lower()}.json"
    file_path = os.path.join("backend", "data", file_name)
    
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)

@app.get("/api/compare/{sport}/{role}")
async def get_comparison(sport: str, role: str, players: str = Query(None, description="Comma-separated player IDs")):
    data = load_sport_data(sport, role)
    if not data:
        raise HTTPException(status_code=404, detail=f"Data for '{sport} - {role}' not found.")
    
    if players:
        player_ids = [p.strip().lower() for p in players.split(",")]
        filtered_players = [p for p in data["players"] if p["id"] in player_ids]
        
        if len(filtered_players) < 2 or len(filtered_players) > 4:
            raise HTTPException(status_code=400, detail="Must select between 2 and 4 valid players.")
            
        data["players"] = filtered_players
        
    return data