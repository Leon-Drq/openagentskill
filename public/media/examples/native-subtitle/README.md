# JFK speech quote-card example

This is a worked example of **native-subtitle-quote-image**, using John F.
Kennedy's September 12, 1962 Rice University speech. OpenAgentSkill selected
the quotation and rendered the card; we did not create the archival footage.

## Sources and subtitle mode

- Footage: NASA's Shuttle–Mir history video archive, **John F. Kennedy speech
  at Rice University** (28-second MPEG with audio):
  https://www.nasa.gov/history/SP-4225/multimedia/before-video.htm
- Original source file, preserved byte-for-byte as **jfk-rice-input.mpg**:
  https://www.nasa.gov/wp-content/uploads/static/history/SP-4225/imagery/videos/v-004.mpg
- Exact selected words checked against the JFK Library's official transcript:
  https://www.jfklibrary.org/archives/other-resources/john-f-kennedy-speeches/rice-university-19620912
- The JFK Library identifies its NASA film of this speech as **Public Domain**:
  https://www.jfklibrary.org/learn/about-jfk/historic-speeches/address-at-rice-university-on-the-nations-space-effort
- NASA media usage guidance:
  https://www.nasa.gov/nasa-brand-center/images-and-media/

The source has no burned-in captions. The output uses the Skill's **script
subtitle mode**: checked English quotation text is drawn onto actual frames.
These are **post-production subtitles**, not text extracted from source pixels.
The six timestamps select representative frames from the speech clip.
Word-level audio alignment was not verified; this is an illustrated quotation,
not an audio transcription or a timed subtitle track.

The archival source is only 352 × 240 pixels. The 1080 × 1440 output crops and
enlarges frames to fit the layout; it does not recover additional source detail.
The original Skill-generated JPG is preserved. WebP files are display copies.

## Reproduce the render

On October 6, 2026 (Los Angeles), we ran the unmodified **v2.1.1** renderer at:

https://github.com/chengyi-ai/native-subtitle-quote-image/tree/f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd

Review the source first. Use a new directory and an isolated Python environment.
The commands assume Python 3.10+ and git; use the venv's Scripts paths on Windows.

~~~sh
git clone https://github.com/chengyi-ai/native-subtitle-quote-image.git
git -C native-subtitle-quote-image checkout f9485e20f03fc0b9e5dfd77d03d5be24f7cebdcd
python3 -m venv .venv
.venv/bin/python -m pip install -r native-subtitle-quote-image/skills/native-subtitle-quote-image/requirements.txt
curl -fL https://www.openagentskill.com/media/examples/native-subtitle/jfk-rice-input.mpg -o jfk-rice-input.mpg
curl -fL https://www.openagentskill.com/media/examples/native-subtitle/script.json -o script.json
.venv/bin/python native-subtitle-quote-image/skills/native-subtitle-quote-image/scripts/native_subtitle_stitch.py render-script jfk-rice-input.mpg \
  --script script.json --out jfk-quote-card.jpg --aspect 3:4 --width 1080 \
  --font /path/to/Arial.ttf
~~~

Replace the font path with a suitable installed font. Compare the result with
**output/jfk-we-choose-the-moon.jpg**. We opened the full-size output and checked
the speaker's face and all six lines for order, readability and clipping.
JPEG/FFmpeg/font differences can change output bytes between environments.

**source.json** records the footage, transcript, source hash and frame-selection
scope. **script.json** contains the checked quotation and local frame times.
**run.json** records the actual CLI run, environment and artifact hashes.
The local builder is **scripts/render-native-subtitle-example.py** in our repo.
It checks both the provided source-file hash and the pinned renderer hash before
copying the input and executing the Skill without project credentials.

## Credits and scope

- Speech: John F. Kennedy, Rice University, September 12, 1962.
- Archival footage: NASA. No endorsement by NASA or the speaker is implied.
- Transcript: John F. Kennedy Presidential Library and Museum.
- Skill author: Chengyi / 程意 (chengyi-ai); code/instructions are MIT, see
  **upstream-LICENSE.txt**. This license does not grant third-party media rights.
- OpenAgentSkill: quotation selection, representative frame selection, checked
  script and this locally rendered worked example.
- One English script-mode CLI render was exercised. Other modes, agent
  installation, translation, security and cross-agent compatibility were not
  tested. Existing catalog review scores and installation policy are unchanged.
