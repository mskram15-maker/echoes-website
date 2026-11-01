# ECHOES

> **Every decision leaves a trace.**

ECHOES is a browser-based, first-person mystery adventure built around three connected cases. Explore a forest, investigate a museum after dark, and uncover the truth inside Blackwood Manor. Search for clues, question characters, and piece the evidence together to solve the story.

## At a glance

| | |
| --- | --- |
| **Genre** | First-person mystery and exploration |
| **Levels** | The Unknown · Museum After Dark · The Final Case |
| **Runs on** | Modern browsers with WebGL support |
| **Built with** | HTML, CSS, JavaScript, Three.js, and Vite |
| **Hosting** | Netlify-ready static site |

### What you can do

- Explore interactive 3D environments and investigate objects.
- Hold a live map and compass; track your position and bearing as you explore.
- Operate the field phone to decrypt messages, contact witnesses, and review your case file.
- Question characters, use inventory tools, and connect clues across cases.
- Walk up to a character or portrait to open a separate in-world phone chat with message bubbles, typing feedback, and conversation memory.
- Play a shared-device co-op case with 2–4 named investigators who take turns and share evidence.
- See the Sustainable Development Goal (SDG) rule for the current level while you play.
- Explore atmospheric exhibits and manor rooms with drifting dust and firelit accents.
- Turn on the museum and manor lights, climb the manor staircase, and inspect its landing.
- Clear escalating traversal challenges: vault one marked log in the easy forest, two obstacles and restore power in the medium museum, then vault three obstacles, restore power, and escape the faster intruder in the hard manor.
- Explore a distant mountain ridge, a textured dirt road, and a visible flowing stream in the forest; the museum and manor use locally bundled PBR stone and wood materials.
- See articulated first-person hands grip the flashlight, field phone, map, and other tools, with subtle movement sway.
- Face non-lethal encounters: repel the forest creature and museum wraith with a flashlight, or use a signal flare to create an escape window from the manor intruder.
- Vault fallen timber, gallery debris, and overturned manor furniture; being caught restarts the current level.
- Listen to a different procedural soundtrack in each level—or stop the music whenever you like.

## Get started

You’ll need [Node.js](https://nodejs.org/) (npm is included) and a modern browser with WebGL enabled.

```sh
# Install project dependencies
npm install

# Start the local development server
npm run dev
```

Open the local address printed in the terminal. Vite reloads the page as you edit files. Stop the server with `Ctrl+C`.

To build and preview the production site locally:

```sh
npm run build
npm run preview
```

## How to play

| Action | Controls |
| --- | --- |
| Move | **WASD** or the on-screen direction buttons |
| Look around | Drag in the 3D scene |
| Inspect an object | Click or tap it |
| Toggle flashlight | **F** or the flashlight button |
| Pick up or drop an object / use a held item | **E** |
| Hold a food, water, medical kit, or flare | Select it in inventory or use the **FLARE** control |
| Use the held food, water, medical kit, or flare | **E** or the on-screen action button |
| Equip a map or compass | Select it in your inventory |
| Open the field phone | **PHONE** button or select the phone in your inventory |
| Power the phone screen on or off | Press the small **⏻** button in the phone status bar; while off, use **POWER ON** in the game controls |
| Use phone apps | Open **Messages**, **Field Map**, **Compass**, or **Case File** |
| Climb the forest hill or vault a nearby obstacle | **Space** |
| Ask for suggestions | Type **help** in the command box |
| Pass the co-op turn | **P** or **PASS TO NEXT** |

Equip the paper map to see a live top-down view of your current level, or equip the compass to read its moving north needle. The phone's **Messages** app decrypts field dispatches in Level 1; in later levels, it opens local witness channels. **Field Map**, **Compass**, and **Case File** remain available as phone apps. The ⏻ button in the phone status bar powers the screen off; the held phone goes dark and the side panel hides until you use **POWER ON**. In Levels 2 and 3, find and use the wall switch before entering the next stage. Vault the marked fallen obstacles with **Space** while moving forward. Walk up the staircase in the manor to inspect the upper landing. When you see **click to talk**, interact with a character to open their phone conversation. Choose a suggested question or type naturally into the message box. Close the phone with its × button or **Escape**. Use **STOP MUSIC** and **PLAY MUSIC** to control the soundtrack.

The cases grow harder as you progress: the forest is **easy** and asks you to vault one marked log; the museum is **medium**, adds a second gallery obstacle and a faster wraith; the manor is **hard**, with three required vaults, a faster intruder, and a timed escape. All traversal obstacles must be cleared before finishing their level. Encounters are designed as non-lethal escape challenges, not combat. In Levels 1 and 2, aim and hold the flashlight on the approaching presence until the route is clear; a signal flare is another limited-use escape aid. In Level 3, use a flare to distract the intruder, vault the overturned study table with **Space**, and reach the study door before the distraction ends. Then vault the two obstacles in the hall before presenting your case. Threats pause while you review clues or use the field phone. If a threat catches you, that level restarts; clues and progress from other levels are retained.

## The three cases

1. **The Unknown** — Find your bearings, investigate the campsite, and follow the trail through the forest.
2. **Museum After Dark** — Question the exhibits, search the gallery, and uncover the mystery behind Project Echo.
3. **The Final Case** — Explore Blackwood Manor, question its residents, and gather evidence to prove your innocence.

## SDG rules and character chats

Each level displays its real-world learning rule next to the objectives:

| Level | SDG | Rule used in the level |
| --- | --- | --- |
| Forest Survival | **15 — Life on Land** | Protect habitats and leave no trace while searching for clues. |
| Closed Museum | **11 — Sustainable Cities and Communities** | Respect cultural heritage and preserve artifacts while investigating. |
| Crime Scene | **16 — Peace, Justice and Strong Institutions** | Follow evidence, question assumptions, and seek a fair outcome. |

The field phone includes Messages, Field Map, Compass, and Case File apps. Conversations take place in the phone, separate from the investigation command log. Each witness has a distinct voice, suggested questions, a persistent per-character chat thread, follow-up context, recaps, and evidence-aware replies. The local story engine handles natural-language topic matching but does not connect to ChatGPT or another hosted AI model; it is deliberately limited to the game's canon and requires no API key or internet connection:

| Character | Voice and role in the story |
| --- | --- |
| Medieval Knight | A terse museum sentinel who recalls a long-coated visitor, the service door, and the 11:03 pulse. |
| Dinosaur Skeleton | A dry, sensor-like echo that reconstructs sounds but makes clear it is not a living dinosaur. |
| Museum Portrait | A witness in paint who remembers the changing scene, a hard case, and the key symbol without claiming to recognize a face. |
| Blackwood Portrait | A witness with a limited point of view who remembers 11:47, the trust, and a figure near the study. |
| Dr. Adrian Vale | A controlled researcher who gives his lab alibi and answers questions about Project Echo. |
| Anna | A careful housekeeper who separates what she saw from what she cannot know, and urges the player to check the CCTV. |

Click or tap a character when the prompt says **click to talk**. In the museum, click the shifting portrait to question its painted witness; typing **examine painting** still inspects the scene directly. Ask a free-form question or select one of the character's suggested prompts. The responses are written to match the storyline, distinguish witness memory from fact, and avoid declaring guilt based on assumptions.

The chat window gives a short getting-started guide and suggested questions so players can discover how to talk to each character. The physical phone model rises into view while a conversation is open. Character threads remain available as you move between levels during a journey.

> **AI transparency:** this school-project build uses a local, story-aware dialogue system—not a real ChatGPT model. Connecting a hosted LLM would require a separately deployed, protected backend and a private provider key; a key must never be embedded in the browser app.

## Play with friends

Choose **Play With Friends**, select two to four investigators, and enter a name for each teammate. The team plays on one device and takes turns using the shared keyboard/controller; press **P** or **PASS TO NEXT** to hand over the lead. The active investigator is credited in the case log when they ask questions or record clues. World state, evidence, and level progress are shared.

This is local pass-the-controller co-op—not online multiplayer. It needs no account or server, and has not been presented as online matchmaking.

## Technology and assets

- **HTML5, CSS3, and JavaScript** power the interface, responsive layouts, and game logic.
- **Three.js (r128)** renders the 3D worlds and loads the tree model.
- **Vite** runs the development server and creates production builds.
- **Web Audio API** generates the level-specific ambient soundtrack in the browser; no audio files or external audio service are required.
- **Netlify** can host the generated static site.

Three.js and game assets are bundled locally. Google Fonts are loaded from an external CDN, so an internet connection is needed for those fonts. Dialogue and command handling use local JavaScript rules; the story chatbots do not connect to an AI service or require an API key. Scene improvements include sharper soft shadows, normal-mapped and roughness-mapped interior surfaces, atmospheric exhibit lighting, environmental particles, detailed character models, and more visible low-light manor lighting.

The forest tree, foliage, and ground textures, along with the interior PBR maps, are free CC0 assets. Sources and credits:

- [Forest asset credits](./public/assets/forest/ASSET_CREDITS.md)
- [Interior asset credits](./public/assets/interiors/ASSET_CREDITS.md)

## Deploy with Netlify

Connect the GitHub repository to Netlify. The included [`netlify.toml`](./netlify.toml) configures the build command and publish directory automatically:

| Netlify setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

No environment variables are required. Each deploy builds the Vite app and publishes `dist`, which contains the bundled game and its local assets. For a manual deploy, run `npm run build` and publish the generated `dist` directory.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | Game screens and interface |
| `styles.css` | Visual styling and responsive layout |
| `public/game.js` | 3D scenes, controls, interaction, and story logic |
| `src/main.js` | Loads Three.js and its glTF decoder, then starts the game script |
| `public/assets/forest/` | Forest models, textures, and asset credits |
| `public/assets/interiors/` | Interior surface maps and asset credits |
| `package.json` | Project dependencies and Vite commands |

The **Play With Friends** screen starts a playable 2–4 investigator local co-op session. Online multiplayer is not implemented.
