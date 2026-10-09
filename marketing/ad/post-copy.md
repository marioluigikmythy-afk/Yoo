# Tranom ad: "One fake link"

A 57-second vertical ad (1080 x 1920, 30 fps, H.264 + AAC, loudness -14 LUFS) for TikTok, Reels and Shorts.

| File | What it is |
| --- | --- |
| `tranom_ad.mp4` | The ad: 3D story, phone screens, narrator, score and sound effects |
| `cover.jpg` | Cover frame (Alex smiling after his account is restored) |
| `tranom_ad.srt` | Subtitles, if you want the platform's own captions as well as the burned-in ones |

Everything is original: the 3D character and room are built in code (`tools/ad`), the website shown is the real tranom.com, the score and sound effects are synthesized (no samples, no licensed music), and the narrator is the open Kokoro voice model (Apache-2.0, speaker "Bella").

## The story

| Time | Scene | Narrator |
| --- | --- | --- |
| 0:00 | Night. Alex is playing in his room. Over the shoulder onto his game, then his face. | This is Alex. Six years on his Roblox account. |
| 0:04 | His phone buzzes: a DM promising 10,000 free Robux, with a link. | Then, one message. Free Robux. Just log in to claim. |
| 0:09 | A fake "claim" page ("Not secure"). He types his password and his 2-step code. | So he did. Password. Two-step code. |
| 0:12 | Close-up: he smiles, the screen glitches red, his face drops. The music tape-stops. | |
| 0:14 | Security alerts: email changed, password changed, new device. Logged out. "LOCKED OUT." | Seconds later, his email and password were changed. He was locked out. |
| 0:19 | Hands on his head. A support reply: "We weren't able to verify that you own this account." | He contacted Roblox Support, which is free. But he couldn't prove the account was his. |
| 0:25 | He searches for help. Tranom comes up, and so does free Roblox Support. | Then he found Tranom. |
| 0:28 | The real tranom.com on his phone: he fills in the form. The ad highlights "Never asks for passwords, codes or cookies". "Request sent. Free." | One short form, free to send. And notice: no password. We never ask for it. |
| 0:34 | Email from Tranom: "Your case review. Priority case, $99, one time." He agrees and pays. | We told him the price up front. Then we got to work. |
| 0:37 | Case file: proof Roblox needs, support request written. Then T1's daily check-ins: Day 1, Day 2 (Roblox asked for one more receipt), Day 3. | We worked out what proof Roblox needed, wrote his support request, and T1, our case agent, followed up with Roblox every day. |
| 0:45 | Morning. A notification: "Ownership verified. Your account access is restored." He lights up. | Until Roblox verified it was his. |
| 0:48 | Back at his desk: new password, 2-Step Verification on, recovery email updated, never share codes. | Then we helped him lock it down. |
| 0:51 | End card: Tranom, "Recover what's yours.", tranom.com, Standard $49, Priority $99, and the fine print. | Tranom. Recover what's yours, at tranom.com |

The fine print on the end card says: "Dramatization. Only Roblox can restore an account, so no one can guarantee recovery. Roblox Support is free. Tranom never asks for your password. Tranom Technologies LLC is not affiliated with Roblox."

## Caption to paste

> One fake "free Robux" link and Alex lost six years of his account. Here's how Tranom helped him get it back. Tranom never asks for your password. Roblox Support is free; we help when you can't prove the account is yours. Not affiliated with Roblox. tranom.com
>
> #roblox #robloxhacked #robloxscam #accountrecovery #robloxsafety #robloxtips

## Before you post

- **Turn on "AI-generated content".** The narrator is a synthetic voice and the video is computer-animated.
- **Keep the end card's fine print.** It says the story is a dramatization and that recovery isn't guaranteed. Don't cut the ad before it.
- **Check the platform's ad rules before you pay to promote it.** Organic posts are simpler. Paid ads go through review, and some platforms are strict about account-recovery services and about naming another company's product. Read the current policy for the platform you're using before boosting.
- **Put tranom.com in your bio.** Links in captions aren't clickable on TikTok.
- **Replies:** if people ask whether it always works, the honest answer is the one in the fine print. Only Roblox can restore an account.

## Changing it

Prices, wording and timings live in `tools/ad`: the narration in `script.json`, the screens in `stage/index.html` and `stage/main.js`. Rebuild with `npm install && npm run build` in `tools/ad` (about 45 minutes, mostly 3D rendering on the CPU).
