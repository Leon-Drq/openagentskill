"""Render a real JFK speech excerpt with the pinned Skill's script mode.

NASA archival footage is credited separately from OpenAgentSkill's example.
English subtitles are added from the JFK Library transcript, not burned into
the source footage. Requires Pillow and imageio-ffmpeg.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import shutil

import imageio_ffmpeg
from PIL import Image, __version__ as pillow_version

REVISION = "f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd"
RENDERER_HASH = "61423e76469d1fe8633c8565cb05d90bc91e51139387e580fcf20e2989efe0b4"
SOURCE_HASH = "95b594e413dd2569146317fe043f6eb712258873ec615326142be65b1823c2b1"
SOURCE_URL = "https://www.nasa.gov/wp-content/uploads/static/history/SP-4225/imagery/videos/v-004.mpg"
SOURCE_PAGE = "https://www.nasa.gov/history/SP-4225/multimedia/before-video.htm"
TRANSCRIPT = "https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/rice-university-19620912"
CLIP_START = 0
CLIP_DURATION = 28.29
LINES = [
    {
        "t": 1,
        "text": "We choose to go to the moon in this decade"
    },
    {
        "t": 7,
        "text": "and do the other things,"
    },
    {
        "t": 11,
        "text": "not because they are easy,"
    },
    {
        "t": 14,
        "text": "but because they are hard,"
    },
    {
        "t": 18,
        "text": "because that goal will serve to organize and measure"
    },
    {
        "t": 22,
        "text": "the best of our energies and skills,"
    }
]


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-script", type=Path, required=True)
    parser.add_argument("--source-video", type=Path, required=True)
    parser.add_argument("--source-sha256", default=SOURCE_HASH, choices=[SOURCE_HASH])
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--font", type=Path, required=True)
    args = parser.parse_args()
    script = args.skill_script.resolve()
    source_video = args.source_video.resolve()
    if sha256(script) != RENDERER_HASH:
        raise SystemExit("Renderer does not match the inspected source revision.")
    if sha256(source_video) != args.source_sha256:
        raise SystemExit("Footage does not match the inspected source file.")
    out = args.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=False)
    video = out / "jfk-rice-input.mpg"
    shutil.copyfile(source_video, video)
    script_json = out / "script.json"
    script_json.write_text(json.dumps({"lines": [{"t": line["t"], "text": line["text"]} for line in LINES]}, indent=2) + "\n")
    source_json = out / "source.json"
    source_json.write_text(json.dumps({
        "speaker": "John F. Kennedy", "event": "Address at Rice University on the Nation's Space Effort",
        "event_date": "1962-09-12", "footage_credit": "NASA, Shuttle–Mir history video archive",
        "source_page": SOURCE_PAGE, "source_video": SOURCE_URL,
        "rights_reference": "https://www.jfklibrary.org/learn/about-jfk/historic-speeches/address-at-rice-university-on-the-nations-space-effort",
        "source_sha256": args.source_sha256, "source_bytes": source_video.stat().st_size,
        "transcript_url": TRANSCRIPT,
        "frame_selection": "Six representative frames at 1, 7, 11, 14, 18 and 22 seconds. These illustrate the selected speech quotation; word-level audio alignment was not verified.",
        "clip_start_seconds": CLIP_START, "clip_duration_seconds": CLIP_DURATION,
        "subtitle_origin": "Post-production English script subtitles; selected quotation checked against the JFK Library transcript, illustrated with real frames from NASA’s speech clip.",
        "selected_lines": LINES,
        "rights": "NASA archival footage, used as an informational worked example under NASA media usage guidelines. JFK Library identifies its NASA recording of this speech as Public Domain.",
        "media_guidelines": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        "editing": "NASA’s 28-second MPEG excerpt preserved byte-for-byte, with audio and source 352 x 240 pixels. Display output crops and enlarges frames; this does not recover archival detail.",
    }, ensure_ascii=False, indent=2) + "\n")
    output = out / "output" / "jfk-we-choose-the-moon.jpg"
    child_env = {key: os.environ[key] for key in ["PATH", "SYSTEMROOT", "WINDIR", "TMPDIR"] if key in os.environ}
    command = [sys.executable, str(script), "render-script", str(video), "--script", str(script_json), "--out", str(output), "--aspect", "3:4", "--width", "1080", "--font", str(args.font.resolve())]
    result = subprocess.run(command, cwd=out, env=child_env, text=True, capture_output=True, check=True)
    print(result.stdout)
    artifacts = [video, script_json, source_json, output]
    report = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "source_repository": "chengyi-ai/native-subtitle-quote-image", "source_revision": REVISION,
        "skill_version": "2.1.1", "renderer_sha256": RENDERER_HASH, "mode": "script",
        "input": {"creator": "NASA", "speaker": "John F. Kennedy", "kind": "archival speech excerpt", "width": 352, "height": 240, "duration_seconds": CLIP_DURATION, "audio": True, "captions_burned_in": False},
        "subtitles": {"origin": "post-production script subtitles", "transcript_url": TRANSCRIPT, "lines": LINES},
        "environment": {"python": platform.python_version(), "pillow": pillow_version, "ffmpeg": imageio_ffmpeg.get_ffmpeg_version(), "platform": platform.system(), "font": args.font.name},
        "exit_code": result.returncode, "stdout": result.stdout.strip(),
        "scope": "One local CLI render of a NASA archival speech excerpt in English script-subtitle mode. Words checked against the JFK Library transcript; representative frame times illustrate the quotation; word-level audio alignment was not verified. Not an installation, native-mode, translation, security or cross-agent test.",
        "artifacts": [{"path": str(p.relative_to(out)), "bytes": p.stat().st_size, "sha256": sha256(p), **({"dimensions": list(Image.open(p).size)} if p.suffix == ".jpg" else {})} for p in artifacts],
    }
    (out / "run.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
