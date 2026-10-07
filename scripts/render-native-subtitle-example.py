"""Create our original input clip, then exercise the pinned upstream renderer.

Requires Pillow and imageio-ffmpeg. This is a local, silent graphic demo, not
third-party footage or a real person's quotation. No account/API keys are used.
Pass the inspected renderer from commit f9485e20; its hash is checked before use.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import subprocess
import sys
from datetime import datetime, timezone

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont, __version__ as pillow_version

REVISION = "f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd"
RENDERER_HASH = "61423e76469d1fe8633c8565cb05d90bc91e51139387e580fcf20e2989efe0b4"
CAPTIONS = [
    "Keep the words. Keep the context.",
    "Start with a video you can publish.",
    "Choose five clear, stable frames.",
    "Keep the subtitles already in the image.",
    "Turn the sequence into one shareable card.",
]
TIMES = [1, 3, 5, 7, 9]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-script", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--font", type=Path)
    args = parser.parse_args()
    script = args.skill_script.resolve()
    if hashlib.sha256(script.read_bytes()).hexdigest() != RENDERER_HASH:
        raise SystemExit("Renderer does not match the inspected source revision.")
    out = args.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=False)
    font_path = args.font or next((p for p in map(Path, [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]) if p.is_file()), None)
    if not font_path:
        raise SystemExit("Provide --font with a font you may use for the original clip.")
    font = lambda size: ImageFont.truetype(str(font_path), size)
    colors = {"paper": "#101c27", "ink": "#eff5ed", "muted": "#95aaa9", "green": "#a9e47c", "panel": "#20333c"}
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    video = out / "input.mp4"
    process = subprocess.Popen([ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1080", "-r", "12", "-i", "pipe:0", "-an", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)], stdin=subprocess.PIPE)
    try:
        for frame_number in range(120):
            scene = frame_number // 24
            image = Image.new("RGB", (1080, 1080), colors["paper"])
            draw = ImageDraw.Draw(image)
            draw.text((64, 66), "OPENAGENTSKILL / ORIGINAL DEMO", font=font(23), fill=colors["muted"])
            draw.text((64, 152), "Video to", font=font(92), fill=colors["ink"])
            draw.text((64, 258), "quote card.", font=font(92), fill=colors["green"])
            draw.rounded_rectangle((64, 414, 1016, 792), radius=24, fill=colors["panel"])
            draw.text((98, 450), "LOCAL SOURCE / BURNED-IN CAPTIONS", font=font(23), fill=colors["muted"])
            for bar in range(43):
                x = 110 + bar * 20
                height = 24 + abs(math.sin(bar * .67 + frame_number * .08)) * 150
                draw.rounded_rectangle((x, 645 - height / 2, x + 8, 645 + height / 2), radius=4, fill=colors["green"] if bar <= frame_number * 43 / 120 else "#486164")
            draw.text((98, 742), f"FRAME {frame_number:03d}   /   {frame_number / 12:04.1f}s", font=font(21), fill=colors["muted"])
            caption_font = font(42)
            while draw.textlength(CAPTIONS[scene], font=caption_font) > 996:
                caption_font = font(caption_font.size - 1)
            draw.text((540, 928), CAPTIONS[scene], anchor="mm", font=caption_font, fill="white")
            draw.text((64, 1024), "GRAPHIC DEMONSTRATION · NOT AN INTERVIEW QUOTE", font=font(20), fill=colors["muted"])
            process.stdin.write(image.tobytes())
    finally:
        process.stdin.close()
    if process.wait() != 0:
        raise SystemExit("Original clip encoding failed.")
    manifest = out / "manifest.json"
    manifest.write_text(json.dumps({"images": [{"title": "video-to-quote-card", "times": TIMES}]}, indent=2) + "\n")
    # No project secrets, inherited shell hooks or API credentials reach upstream code.
    child_env = {key: os.environ[key] for key in ["PATH", "SYSTEMROOT", "WINDIR", "TMPDIR"] if key in os.environ}
    command = [sys.executable, str(script), "render", str(video), "--manifest", str(manifest), "--out-dir", str(out / "output"), "--band-top", "0.80", "--band-bottom", "0.90", "--aspect", "3:4", "--width", "1080"]
    result = subprocess.run(command, cwd=out, env=child_env, text=True, capture_output=True, check=True)
    print(result.stdout)
    artifacts = [video, manifest, *sorted((out / "output").iterdir())]
    report = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "source_repository": "chengyi-ai/native-subtitle-quote-image", "source_revision": REVISION,
        "skill_version": "2.1.1", "renderer_sha256": RENDERER_HASH, "mode": "native",
        "input": {"creator": "OpenAgentSkill", "kind": "original graphic demonstration", "width": 1080, "height": 1080, "duration_seconds": 10, "fps": 12, "audio": False, "captions_burned_in": True, "captions": CAPTIONS},
        "environment": {"python": platform.python_version(), "pillow": pillow_version, "ffmpeg": imageio_ffmpeg.get_ffmpeg_version(), "platform": platform.system()},
        "exit_code": result.returncode, "stdout": result.stdout.strip(),
        "scope": "One local CLI render of an original English clip. Not an installation, URL download, translation, security or cross-agent test.",
        "artifacts": [{"path": str(p.relative_to(out)), "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), **({"dimensions": list(Image.open(p).size)} if p.suffix == ".jpg" else {})} for p in artifacts],
    }
    (out / "run.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
