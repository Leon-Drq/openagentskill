# Native subtitle quote-image demonstration

OpenAgentSkill created this silent graphic video and its five caption lines.
It is not third-party footage, an interview or another person's quotation.
The waveform is a graphic animation; the input has no audio track.

On October 6, 2026 (Los Angeles) we rendered it with the **unmodified v2.1.1**
native-mode script from the version already in our catalog:

https://github.com/chengyi-ai/native-subtitle-quote-image/tree/f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd

The input has burned-in English captions. The native renderer extracts their
pixels; no OCR, translation or text redrawing is used in this render.
The output is 1080 × 1440: one main frame and four subtitle strips.
All five lines were opened and visually inspected for readability and clipping.

## Reproduce the render

Review the linked upstream source first. Use a new directory and a local Python
environment; install the upstream requirements there. The commands below assume
Python 3.10+ and git are available. On Windows, use the venv's Scripts paths.

```sh
git clone https://github.com/chengyi-ai/native-subtitle-quote-image.git
git -C native-subtitle-quote-image checkout f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd
python3 -m venv .venv
.venv/bin/python -m pip install -r native-subtitle-quote-image/skills/native-subtitle-quote-image/requirements.txt
curl -fL https://www.openagentskill.com/media/examples/native-subtitle/input.mp4 -o input.mp4
curl -fL https://www.openagentskill.com/media/examples/native-subtitle/manifest.json -o manifest.json
.venv/bin/python native-subtitle-quote-image/skills/native-subtitle-quote-image/scripts/native_subtitle_stitch.py render input.mp4 \
  --manifest manifest.json --out-dir quote-card-output \
  --band-top 0.80 --band-bottom 0.90 --aspect 3:4 --width 1080
```

View the generated JPG and compare it with `output/01_video-to-quote-card.jpg`.
FFmpeg/JPEG versions can change encoded bytes; matching hashes is not promised
when recreating the render on another environment. `run.json` records the files
from our actual run, with hashes, environment and scoped visual observations.

The original input builder is `scripts/render-native-subtitle-example.py` in
the OpenAgentSkill repository. It requires a local font, Pillow and
imageio-ffmpeg. Pass the inspected upstream script with `--skill-script` and a
new `--out-dir`; it verifies the script's SHA-256 before executing it.

## Scope and attribution

- Skill author: Chengyi / 程意 (chengyi-ai).
- Skill code and instructions: MIT; see `upstream-LICENSE.txt`.
- Input video, caption text and demonstration: original OpenAgentSkill material.
- WebP files are resized display copies of the actual JPG output.
- This demonstration is separate from the catalog's AI review, quality score
  and installation permissions. We did not modify those records.
- One local English native render was exercised. Agent installation, URL
  downloading, script subtitles, CJK rendering, security and newer releases
  were not tested in this example.

The repository's MIT license does not grant rights to arbitrary third-party
video footage. For your own project, use input you may process and publish.
