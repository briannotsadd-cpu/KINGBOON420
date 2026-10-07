# BOON UI — Design Directions (Agent 04, Wave 2) — PARTIAL

Status: **BLOCKED on Figma.** File created, but the Figma MCP Starter-plan tool-call limit was hit before any page or
screen was built. Contents below are tokens and contrast only. No mock-ups exist; no HTML fallback was made (per brief).
Figma file (empty, 1 blank page): https://www.figma.com/design/38kF8cTZpBE7GOwgicGtgF
To finish: upgrade the plan or wait for the limit to reset, then re-run Agent 04 with the tokens below (no rework needed).
Opus chooses the final direction; nothing here is a recommendation.

## Directions (rationale)
| Direction | Idea | Thai / Latin type (Google Fonts) |
|---|---|---|
| Sacred Minimal | Warm paper, ink, one saffron-brown accent; generous space, hairlines, almost no ornament. Silence as luxury. | Heading Noto Serif Thai / Lora; body Noto Sans Thai / Inter |
| Thai Neo-Future | Cool jade-teal on near-white/near-black, crisp geometry, gold only for emphasis; modern instrument-panel feel without neon. | Heading Prompt / Space Grotesk; body IBM Plex Sans Thai / Inter |
| Living Temple | Moss, terracotta and parchment; soft organic cards, lotus/leaf motifs sparingly; human and warm. | Heading Noto Serif Thai / Fraunces; body Sarabun / DM Sans |

Shared: Command Center (W01) keeps the UX order (decisions strip, monastic panel, Unknown tile "ไม่ทราบ" always shown);
monastic score label "แต้มกิจวัตร"; no ranking; sample numbers only under a "ข้อมูลตัวอย่าง" badge.
Spacing scale (all): 4 8 12 16 24 32 48; touch target >= 48 (tiles >= 56). Radius: A 8/12, B 6/10, C 16/24.
Thai line-height >= 1.6 body, 1.4 heading (tone marks need room).

## Motion notes (3 per direction)
- A: 200 ms ease-out fades only; no movement of content; panel expand = height fade.
- B: 160 ms linear-ish slide for drill-down panes; counter values change with a 120 ms cross-fade, never count-up.
- C: 280 ms gentle ease-in-out; a slow 6 s breathing glow on the refresh chip only.
All: honour reduced-motion (instant); no confetti, no coins, no flashing, no streak pressure.

## Tokens (hex) — machine-readable in `docs/design/tokens.draft.json`

### Sacred Minimal
| token | light | dark |
|---|---|---|
| bg | #FAF7F0 | #15120E |
| surface | #FFFFFF | #201B15 |
| ink | #1F1B16 | #F3EDE2 |
| muted | #5E564B | #B5AA99 |
| primary | #8A4B0F | #E3A25B |
| onPrimary | #FFFFFF | #1F1B16 |
| accent | #7A5A00 | #E0B85A |
| ok | #2F6B3F | #7FC08F |
| warn | #8A5A00 | #E0B04F |
| danger | #A12A2A | #F08A8A |
| unknown | #4A4F7A | #AEB4E6 |

### Thai Neo-Future
| token | light | dark |
|---|---|---|
| bg | #F1F5F4 | #0A1214 |
| surface | #FFFFFF | #131E21 |
| ink | #0E1A1C | #E6F1F0 |
| muted | #475B5E | #9DB3B5 |
| primary | #006A6A | #4FD1C5 |
| onPrimary | #FFFFFF | #06201E |
| accent | #8C5E00 | #F2C14E |
| ok | #1E6B45 | #6FD6A0 |
| warn | #8A5A00 | #F2C14E |
| danger | #B3261E | #FF8A80 |
| unknown | #3D4F8F | #A9B8F5 |

### Living Temple
| token | light | dark |
|---|---|---|
| bg | #F6F1E7 | #14170F |
| surface | #FFFDF8 | #1E2217 |
| ink | #2A2418 | #EEEBDD |
| muted | #5C5543 | #B3B39C |
| primary | #3F6B3A | #9CCB86 |
| onPrimary | #FFFFFF | #12200E |
| accent | #A64B22 | #E58F65 |
| ok | #2F6B3A | #8FD19A |
| warn | #8A5A00 | #E8B64F |
| danger | #A8321F | #F29A88 |
| unknown | #5B5A8C | #B5B4EA |

## WCAG 2.x contrast (output of `python3 -I docs/design/contrast.py docs/design/tokens.draft.json`)

| Direction | Mode | fg on bg | ratio | AA 4.5 |
|---|---|---|---|---|
| Sacred Minimal | light | ink #1F1B16 on bg #FAF7F0 | 16.00 | PASS |
| Sacred Minimal | light | ink #1F1B16 on surface #FFFFFF | 17.12 | PASS |
| Sacred Minimal | light | muted #5E564B on bg #FAF7F0 | 6.75 | PASS |
| Sacred Minimal | light | muted #5E564B on surface #FFFFFF | 7.22 | PASS |
| Sacred Minimal | light | primary #8A4B0F on bg #FAF7F0 | 6.34 | PASS |
| Sacred Minimal | light | onPrimary #FFFFFF on primary #8A4B0F | 6.79 | PASS |
| Sacred Minimal | light | accent #7A5A00 on surface #FFFFFF | 6.38 | PASS |
| Sacred Minimal | light | ok #2F6B3F on surface #FFFFFF | 6.37 | PASS |
| Sacred Minimal | light | warn #8A5A00 on surface #FFFFFF | 5.93 | PASS |
| Sacred Minimal | light | danger #A12A2A on surface #FFFFFF | 7.29 | PASS |
| Sacred Minimal | light | unknown #4A4F7A on surface #FFFFFF | 7.80 | PASS |
| Sacred Minimal | dark | ink #F3EDE2 on bg #15120E | 16.02 | PASS |
| Sacred Minimal | dark | ink #F3EDE2 on surface #201B15 | 14.66 | PASS |
| Sacred Minimal | dark | muted #B5AA99 on bg #15120E | 8.16 | PASS |
| Sacred Minimal | dark | muted #B5AA99 on surface #201B15 | 7.47 | PASS |
| Sacred Minimal | dark | primary #E3A25B on bg #15120E | 8.52 | PASS |
| Sacred Minimal | dark | onPrimary #1F1B16 on primary #E3A25B | 7.81 | PASS |
| Sacred Minimal | dark | accent #E0B85A on surface #201B15 | 9.09 | PASS |
| Sacred Minimal | dark | ok #7FC08F on surface #201B15 | 8.01 | PASS |
| Sacred Minimal | dark | warn #E0B04F on surface #201B15 | 8.54 | PASS |
| Sacred Minimal | dark | danger #F08A8A on surface #201B15 | 7.08 | PASS |
| Sacred Minimal | dark | unknown #AEB4E6 on surface #201B15 | 8.52 | PASS |
| Thai Neo-Future | light | ink #0E1A1C on bg #F1F5F4 | 16.15 | PASS |
| Thai Neo-Future | light | ink #0E1A1C on surface #FFFFFF | 17.75 | PASS |
| Thai Neo-Future | light | muted #475B5E on bg #F1F5F4 | 6.53 | PASS |
| Thai Neo-Future | light | muted #475B5E on surface #FFFFFF | 7.18 | PASS |
| Thai Neo-Future | light | primary #006A6A on bg #F1F5F4 | 5.84 | PASS |
| Thai Neo-Future | light | onPrimary #FFFFFF on primary #006A6A | 6.42 | PASS |
| Thai Neo-Future | light | accent #8C5E00 on surface #FFFFFF | 5.65 | PASS |
| Thai Neo-Future | light | ok #1E6B45 on surface #FFFFFF | 6.47 | PASS |
| Thai Neo-Future | light | warn #8A5A00 on surface #FFFFFF | 5.93 | PASS |
| Thai Neo-Future | light | danger #B3261E on surface #FFFFFF | 6.54 | PASS |
| Thai Neo-Future | light | unknown #3D4F8F on surface #FFFFFF | 7.74 | PASS |
| Thai Neo-Future | dark | ink #E6F1F0 on bg #0A1214 | 16.41 | PASS |
| Thai Neo-Future | dark | ink #E6F1F0 on surface #131E21 | 14.74 | PASS |
| Thai Neo-Future | dark | muted #9DB3B5 on bg #0A1214 | 8.61 | PASS |
| Thai Neo-Future | dark | muted #9DB3B5 on surface #131E21 | 7.73 | PASS |
| Thai Neo-Future | dark | primary #4FD1C5 on bg #0A1214 | 10.15 | PASS |
| Thai Neo-Future | dark | onPrimary #06201E on primary #4FD1C5 | 9.13 | PASS |
| Thai Neo-Future | dark | accent #F2C14E on surface #131E21 | 10.13 | PASS |
| Thai Neo-Future | dark | ok #6FD6A0 on surface #131E21 | 9.55 | PASS |
| Thai Neo-Future | dark | warn #F2C14E on surface #131E21 | 10.13 | PASS |
| Thai Neo-Future | dark | danger #FF8A80 on surface #131E21 | 7.45 | PASS |
| Thai Neo-Future | dark | unknown #A9B8F5 on surface #131E21 | 8.79 | PASS |
| Living Temple | light | ink #2A2418 on bg #F6F1E7 | 13.68 | PASS |
| Living Temple | light | ink #2A2418 on surface #FFFDF8 | 15.14 | PASS |
| Living Temple | light | muted #5C5543 on bg #F6F1E7 | 6.58 | PASS |
| Living Temple | light | muted #5C5543 on surface #FFFDF8 | 7.29 | PASS |
| Living Temple | light | primary #3F6B3A on bg #F6F1E7 | 5.53 | PASS |
| Living Temple | light | onPrimary #FFFFFF on primary #3F6B3A | 6.22 | PASS |
| Living Temple | light | accent #A64B22 on surface #FFFDF8 | 5.66 | PASS |
| Living Temple | light | ok #2F6B3A on surface #FFFDF8 | 6.29 | PASS |
| Living Temple | light | warn #8A5A00 on surface #FFFDF8 | 5.83 | PASS |
| Living Temple | light | danger #A8321F on surface #FFFDF8 | 6.58 | PASS |
| Living Temple | light | unknown #5B5A8C on surface #FFFDF8 | 6.29 | PASS |
| Living Temple | dark | ink #EEEBDD on bg #14170F | 15.15 | PASS |
| Living Temple | dark | ink #EEEBDD on surface #1E2217 | 13.55 | PASS |
| Living Temple | dark | muted #B3B39C on bg #14170F | 8.49 | PASS |
| Living Temple | dark | muted #B3B39C on surface #1E2217 | 7.59 | PASS |
| Living Temple | dark | primary #9CCB86 on bg #14170F | 9.75 | PASS |
| Living Temple | dark | onPrimary #12200E on primary #9CCB86 | 9.12 | PASS |
| Living Temple | dark | accent #E58F65 on surface #1E2217 | 6.52 | PASS |
| Living Temple | dark | ok #8FD19A on surface #1E2217 | 9.07 | PASS |
| Living Temple | dark | warn #E8B64F on surface #1E2217 | 8.67 | PASS |
| Living Temple | dark | danger #F29A88 on surface #1E2217 | 7.52 | PASS |
| Living Temple | dark | unknown #B5B4EA on surface #1E2217 | 8.24 | PASS |

FAILS: 0
