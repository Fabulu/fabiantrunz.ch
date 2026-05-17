# Sound Assets Brief — fabiantrunz.ch Driving Game

## Target Directory

All audio files go in: `C:\Programmieren\portfoliosite\public\audio\`

Create this directory and place all files there. The web app references them as `/audio/filename.mp3`.

## Files Needed

### Music

| Filename | Description | Duration | Source |
|----------|-------------|----------|--------|
| `music-driving.mp3` | Ambient/chill loop for driving mode. Lo-fi, relaxed, unobtrusive. Think lo-fi hip hop study beats or calm synth ambient. Should loop seamlessly. Not too energetic — the player is exploring a portfolio, not racing. | 60-120s | Pixabay, OpenGameArt, Free Music Archive — CC0/no attribution required |

### Sound Effects

| Filename | Description | Duration | Source |
|----------|-------------|----------|--------|
| `engine-loop.mp3` | Car engine idle/running loop. Will be pitch-shifted with playbackRate (0.5x at idle to 2.0x at max speed). Needs to loop cleanly. Low rumble, not aggressive. | 2-5s | Pixabay or Freesound — CC0. Search "car engine loop", "engine idle loop", "motor hum" |
| `boost.mp3` | Speed boost activation. Whoosh/rush/turbo sound. Short, punchy. | 0.5-1.5s | Pixabay — search "whoosh", "speed boost", "turbo", "rush wind" |
| `jump.mp3` | Car launching into the air. Upward whoosh or spring/boing. Light, playful. | 0.3-0.8s | Pixabay — search "jump", "spring", "whoosh up", "launch" |
| `land.mp3` | Car landing on ground. Soft thud/impact. Not too heavy — it's a toy car. | 0.3-0.8s | Pixabay — search "thud", "soft impact", "landing", "drop" |
| `rock-hit.mp3` | Car hitting a rock. Clunk/knock sound. | 0.3-0.5s | Pixabay — search "rock hit", "stone clunk", "knock", "bump" |
| `box-open.mp3` | Box walls falling away at transition. Creaking/breaking/whoosh. Dramatic but short. | 1-2s | Pixabay — search "door creak", "wood break", "panel fall", "dramatic whoosh" |

## Format Requirements

- **Format:** MP3 (universal browser support)
- **Quality:** 128kbps is fine (small files, fast loading)
- **Channels:** Mono is preferred for SFX (smaller files), stereo OK for music
- **Normalization:** All files should be roughly the same loudness level (-16 to -14 LUFS)
- **Looping:** `music-driving.mp3` and `engine-loop.mp3` MUST loop cleanly (no click/pop at the seam)

## Total Target

7 audio files, total size ideally under 2MB.

## Licensing

ALL files must be CC0, Public Domain, or explicitly "no attribution required" licensed. Do NOT use CC-BY or any license requiring attribution in the source code — the portfolio site has no credits page.

## Where to Search

1. **Pixabay** (https://pixabay.com/sound-effects/ and https://pixabay.com/music/) — best for quick CC0 downloads, no account needed
2. **OpenGameArt** (https://opengameart.org/) — search with CC0 filter
3. **Freesound** (https://freesound.org/) — filter by CC0 license (requires free account)
4. **Free Music Archive** (https://freemusicarchive.org/) — filter by CC0
