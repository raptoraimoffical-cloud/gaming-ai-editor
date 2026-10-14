"""Install original licensed sprite sheets. Cache assets, never authored edits."""
import argparse
import hashlib
import io
import json
import re
import zipfile
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets" / "pixel-effects"
CC0 = "https://creativecommons.org/publicdomain/zero/1.0/"
WEATHER = "https://heyheythere.itch.io/weather-overlays-free"
CODEMANU = "https://opengameart.org/content/free-pixel-effects-pack"
SOLUNA = "https://opengameart.org/content/explosion-effects-and-more"


def unzip(data, folder):
    folder = folder.resolve()
    folder.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(f.file_size for f in archive.infolist()) > 100_000_000:
            raise ValueError("Unexpectedly large effect archive")
        for entry in archive.infolist():
            target = (folder / entry.filename).resolve()
            if not target.is_relative_to(folder):
                raise ValueError("Unsafe archive path")
            if not entry.is_dir():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(archive.read(entry))


def get(session, url):
    response = session.get(url, timeout=40)
    response.raise_for_status()
    return response


def install(refresh=False):
    ROOT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    if refresh or len(list((ROOT / "codemanu-20").glob("*spritesheet.png"))) != 20:
        unzip(get(session, "https://opengameart.org/sites/default/files/Free%20Pixel%20Effects%20Pack.zip").content, ROOT / "codemanu-20")
    if refresh or not (ROOT / "soluna-aura.png").exists():
        (ROOT / "soluna-aura.png").write_bytes(get(session, "https://opengameart.org/sites/default/files/Aura38.png").content)
    base = ROOT / "weather" / "weather-overlays-free"
    if refresh or not all((base / "sheets" / "pixel" / f).exists() for f in ["rain_light.png", "snow_light.png", "fog.png", "leaves.png"]):
        page = get(session, WEATHER).text
        csrf = re.search(r'name="csrf_token" value="([^"]+)"', page).group(1)
        upload = re.search(r'data-upload_id="(\d+)"', page).group(1)
        response = session.post(WEATHER + "/download_url", data={"csrf_token": csrf}, timeout=30)
        response.raise_for_status()
        landing_url = response.json()["url"]
        landing = get(session, landing_url).text
        csrf = re.search(r'name="csrf_token" value="([^"]+)"', landing).group(1)
        response = session.post(WEATHER + "/file/" + upload, data={"csrf_token": csrf}, headers={"Referer": landing_url, "X-Requested-With": "XMLHttpRequest"}, timeout=30)
        response.raise_for_status()
        unzip(get(session, response.json()["url"]).content, ROOT / "weather")

    entries = []
    def record(file, key, name, sheet, source, credit, license_name, license_url):
        image = Image.open(file)
        entries.append({"key": key, "name": name, "file": file.relative_to(ROOT).as_posix(), "width": image.width, "height": image.height, "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "sheet": sheet, "source": source, "credit": credit, "license": license_name, "licenseUrl": license_url})

    keys = ["magic-spell", "magic-eight", "blue-fire", "casting", "magic-hit", "flame-lash", "fire-spin", "protection-circle", "bright-fire", "weapon-hit", "fire", "nebula", "vortex", "phantom", "loading", "sunburn", "felspell", "midnight", "freezing", "magic-bubbles"]
    for file in sorted((ROOT / "codemanu-20").glob("*spritesheet.png"), key=lambda f: int(f.name.split("_")[0])):
        image = Image.open(file).convert("RGBA")
        columns = image.width // 100
        boxes = []
        for frame in range(columns * columns):
            x, y = frame % columns * 100, frame // columns * 100
            box = image.crop((x, y, x + 100, y + 100)).getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            if box:
                boxes.append(box)
        x, y = min(b[0] for b in boxes), min(b[1] for b in boxes)
        bounds = {"x": x, "y": y, "width": max(b[2] for b in boxes) - x, "height": max(b[3] for b in boxes) - y}
        key = keys[int(file.name.split("_")[0]) - 1]
        record(file, key, "Pixel FX - " + key.replace("-", " ").title(), {"columns": columns, "frames": columns * columns, "frameWidth": 100, "frameHeight": 100, "fps": 30, "loop": True, "bounds": bounds}, CODEMANU, "CodeManu and David Masia", "CC0-1.0", CC0)
    record(ROOT / "soluna-aura.png", "power-aura", "Pixel FX - Power-up aura (gold available)", {"columns": 8, "frames": 32, "frameWidth": 128, "frameHeight": 128, "fps": 24, "loop": True, "bounds": {"x": 20, "y": 0, "width": 96, "height": 128}}, SOLUNA, "Soluna Software", "CC0-1.0", CC0)
    for effect in json.loads((base / "sheets" / "effects.json").read_text(encoding="utf-8"))["effects"]:
        key = {"rain_light": "rain", "snow_light": "snow"}.get(effect["name"], effect["name"])
        size = effect["cell"]["pixel"]
        record(base / "sheets" / "pixel" / effect["file"], key, "Pixel Weather - " + key.title(), {"columns": effect["columns"], "frames": effect["frames"], "frameWidth": size[0], "frameHeight": size[1], "fps": effect["fps"], "loop": True, "tile": True, "displayTile": 512 if key == "fog" else 256}, WEATHER, "Weather Overlays Free by heyheythere", "CC-BY-4.0", "https://creativecommons.org/licenses/by/4.0/")
    (ROOT / "manifest.json").write_text(json.dumps({"version": 1, "effects": entries}, indent=2), encoding="utf-8")
    print(json.dumps({"installed": len(entries), "folder": str(ROOT), "authoredProjectsSaved": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--refresh", action="store_true")
    install(parser.parse_args().refresh)
