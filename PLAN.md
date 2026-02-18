# Mahjong App Plan

Real-time multiplayer mahjong app using PartyKit + Svelte 5.

## Architecture

- **Frontend**: Svelte 5 + TypeScript + Vite
- **Backend**: PartyKit (WebSocket-based real-time server)
- **Deployment**: GitHub Pages (frontend) + PartyKit (backend)

One shared "table" screen (iPad) shows the game board. Up to 4 players connect on phones with private hands. Room codes for joining, no auth/database needed.

## Ruleset

Hong Kong (Cantonese) mahjong as default, with ruleset abstraction for future variants.

- 144 tiles (suits 1-9, honors, flowers/seasons)
- Chi from left player only
- Fan-based scoring
- Standard 4-player format

## Slices

### Slice 1: Core types + Ruleset interface + HK tile config
- [x] `src/game/types.ts` - All TypeScript types
- [x] `src/game/rulesets/hongkong.ts` - HK ruleset implementation
- [x] `src/game/rulesets/index.ts` - Ruleset registry
- [x] Unit tests for win detection and scoring

### Slice 2+3: Game engine + PartyKit server
- [x] `src/game/engine.ts` - Pure game logic
- [x] `party/index.ts` - PartyKit server
- [x] `partykit.json` - PartyKit config
- [x] Per-client state redaction (players only see their own hand)

### Slice 4: Frontend - join room, see hand, discard, QR codes
- [x] `src/lib/connection.ts` - WebSocket connection management
- [x] `src/lib/tiles.ts` - Unicode tile display
- [x] `src/components/Tile.svelte` - Tile rendering
- [x] `src/components/Hand.svelte` - Hand display
- [x] `src/views/HomeView.svelte` - Create/join room
- [x] `src/views/LobbyView.svelte` - QR code, seat selection
- [x] `src/views/GameView.svelte` - Game board
- [x] `src/App.svelte` - Main routing

### Slice 5: Calls - Peng/Chi/Gang
- [x] Add call detection in engine
- [x] Add call UI prompts
- [x] Handle call priority (gang > peng > chi)
- [x] Update server to manage call windows

### Slice 6: Win detection + scoring UI
- [ ] Integrate win detection into game flow
- [ ] Scoring display at end of round
- [ ] Handle draws (exhausted wall)
- [ ] Multi-round game tracking

## Running Locally

```bash
# Install dependencies
npm install

# Run frontend + backend together
npm run dev:all

# Run tests
npm run test:run
```

## Deployment

```bash
# Deploy PartyKit backend
npm run deploy

# Frontend deploys via GitHub Actions on push to main
```

## Current Status

Slices 1-5 complete. Call system works:
- Create/join rooms with 4-character codes
- QR code scanning to join
- Seat selection in lobby
- Deal tiles and take turns discarding
- Turn rotation
- Peng (triplet) from any player
- Chi (sequence) from left player only
- Gang (quad) from any player
- Priority resolution (gang > peng > chi)
- Exposed melds displayed

Bot players implemented:
- Empty seats auto-fill with bots on game start
- Bots make random discards with thinking delays (500-1500ms)
- Bots respond to call windows (50% chance to call if available)
- Humans can join mid-game and "bump" a bot to take their seat
- Bot names: "Bot East", "Bot South", "Bot West", "Bot North"

UI/Design overhaul completed:
- Refined "Chinese gambling parlor" aesthetic with rosewood/mahogany dark theme
- Gold and jade accent colors throughout
- Crimson Pro (serif) for headings, DM Sans for body text
- Tactile 3D tile effects with realistic shadows and glow on selection
- Animated transitions: floating logo, tile appearances, turn indicators
- Fully responsive design for mobile devices (scales down tiles, buttons, layouts)
- Global CSS variables for consistent theming

## Next Steps

1. Implement Slice 6 (win detection UI, scoring display)
2. Polish: sound effects, haptic feedback
