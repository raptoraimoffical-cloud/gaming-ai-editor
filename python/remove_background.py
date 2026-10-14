"""Persistent CPU segmentation worker; preserve original pixels and resolution."""
import json
import sys
from pathlib import Path

session = None
for line in sys.stdin:
    request = {}
    try:
        request = json.loads(line)
        from PIL import Image
        from rembg import remove, new_session
        if session is None:
            session = new_session("isnet-general-use")
        original = Image.open(request["input"]).convert("RGBA")
        result = remove(original, session=session, post_process_mask=False)
        alpha = result.getchannel("A")
        histogram = alpha.histogram()
        total = original.width * original.height
        if sum(histogram[32:]) / total < .015 or sum(histogram[:224]) / total < .02:
            raise ValueError("Segmentation did not produce a usable foreground cutout")
        # Keep the source's exact RGB pixels. Only the alpha mask is changed.
        original.putalpha(alpha)
        output = Path(request["output"])
        output.parent.mkdir(parents=True, exist_ok=True)
        original.save(str(output), format="PNG")
        print(json.dumps({"id": request["id"], "ok": True, "width": original.width,
                          "height": original.height, "model": "isnet-general-use"}), flush=True)
    except Exception as error:
        print(json.dumps({"id": request.get("id"), "ok": False, "error": str(error)}), flush=True)
