# Tranom TikToks

Two vertical videos (1080 x 1920, 30 fps, H.264 + AAC, loudness -14 LUFS), ready to upload.

| File | Length | Sound |
| --- | --- | --- |
| `tranom_tiktok_voice.mp4` | 1:00 | Voiceover with word-by-word captions, music ducked underneath, light sound effects |
| `tranom_tiktok_music.mp4` | 0:56 | No voice. Music and sound effects, with a short caption on every scene so it works on mute |
| `cover.jpg` | | Cover frame ("Locked out of your Roblox account?") |
| `tranom_tiktok_voice.srt` | | Subtitles for the voice version, if you want TikTok's own captions instead of or as well as the burned-in ones |

Everything in them is original: the 3D scenes are rendered from `tools/render`, the music and sound effects are synthesized in `tools/video/audio.py` (no samples, no licensed tracks), and the voice is the open Kokoro model (Apache-2.0, speaker "Bella"). You can post them without copyright claims.

## What each scene says

| # | Scene | Voice version (spoken) | Music version (on screen) |
| --- | --- | --- | --- |
| 1 | Hook | Locked out of your Roblox account? Here's how Tranom helps. Honestly. | Here's how Tranom helps. Honestly. |
| 2 | Roblox Support is free | First, Roblox Support is free. You can always contact them yourself. | You can always contact them yourself. |
| 3 | Who it's for | Tranom is for when your tickets keep getting rejected, you're not sure what proof to send, or you want someone to follow up. | That's where Tranom comes in. |
| 4 | Step 1 | Tell us what happened, in one short form. It's free to send. | One short form. Free to send. |
| 5 | Step 2 | We work out exactly what proof Roblox needs, and write your support request for you. | Then we write your support request for you. |
| 6 | Step 3 | T1, our case agent, and our team follow up with Roblox every day, until your case is verified and complete. | T1 + our team check in with Roblox daily. |
| 7 | Step 4 | Once you're back in, we help you lock the account down. | We help you secure the account. |
| 8 | How we keep you safe | We never ask for your password, codes, or cookies. We only use official Roblox channels, and we're not affiliated with Roblox. | No passwords. No tricks. No special access. |
| 9 | Honest | Only Roblox can restore an account, so no one can guarantee it. We just make your case as strong as it can be. | Honest from the start. |
| 10 | Price | A Standard case is $49. A Priority case is $99. Cancel before we start, and you get a full refund. | One-time price. No hidden fees. |
| 11 | Call to action | Tranom. Recover what's yours, at tranom.com | Start at tranom.com |

## Captions to paste

**Voice version**

> Locked out of your Roblox account? Here's exactly how Tranom works, start to finish. Roblox Support is free and you can always use it yourself. We help when your tickets keep getting rejected. We never ask for your password. Not affiliated with Roblox. tranom.com
>
> #roblox #robloxhacked #robloxaccount #accountrecovery #robloxtips #gaming

**Music version**

> How Tranom helps you get your Roblox account back, in 4 steps. No passwords, official Roblox channels only, full refund if you cancel before we start. Not affiliated with Roblox. tranom.com
>
> #roblox #robloxhacked #robloxaccount #accountrecovery #robloxtips #gamingtips

## Before you post

- **Turn on "AI-generated content"** in the post settings for the voice version. The voiceover is a synthetic voice, and TikTok asks creators to label realistic AI-made audio.
- **Pick `cover.jpg` as the cover**, or choose the first frame in TikTok's cover picker. Both show the hook line.
- **Add the link to tranom.com in your bio.** TikTok doesn't make links in captions clickable.
- **Keep the "not affiliated with Roblox" line** in the caption and don't add the Roblox logo, so the post doesn't look like an official Roblox account.
- **Stay accurate in replies.** If people ask about results, the honest answer is the one in the video: only Roblox can restore an account, and no one can guarantee it.
- **If prices or the refund rule change,** edit `tools/video/script.json` and the price scene in `tools/video/stage/index.html`, then rebuild (see the main README), so the videos match the site.
