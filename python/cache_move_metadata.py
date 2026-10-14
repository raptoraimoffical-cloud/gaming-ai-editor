"""Refresh offline move facts from the primary PokeAPI data repository."""
import csv
import io
import json
import urllib.request
from pathlib import Path

prefix = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/"
def read(name):
    with urllib.request.urlopen(prefix + name, timeout=30) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode())))

types = {r["id"]: r["identifier"] for r in read("types.csv")}
stats = {r["id"]: r["identifier"] for r in read("stats.csv")}
targets = {r["id"]: r["identifier"] for r in read("move_targets.csv")}
changes = {}
for row in read("move_meta_stat_changes.csv"):
    changes.setdefault(row["move_id"], []).append({"stat": stats[row["stat_id"]], "change": int(row["change"])})
moves = []
for row in read("moves.csv"):
    name = row["identifier"]
    moves.append({"kind": "move", "name": name, "title": name.replace("-", " ").title(),
                  "type": types[row["type_id"]],
                  "damageClass": {"1": "status", "2": "physical", "3": "special"}[row["damage_class_id"]],
                  "power": int(row["power"]) if row["power"] else None,
                  "accuracy": int(row["accuracy"]) if row["accuracy"] else None,
                  "statChanges": changes.get(row["id"], []),
                  "target": targets[row["target_id"]],
                  "source": "https://pokeapi.co/api/v2/move/" + name + "/",
                  "metadataSource": prefix + "moves.csv"})
target = Path(__file__).resolve().parents[1] / "electron/data/core-moves.json"
target.write_text(json.dumps({"source": prefix + "moves.csv", "moves": moves}, indent=2) + "\n", encoding="utf-8")
print("Cached source-backed move records:", len(moves))
