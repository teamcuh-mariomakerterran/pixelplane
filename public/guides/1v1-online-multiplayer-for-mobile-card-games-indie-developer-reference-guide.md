# 1v1 Online Multiplayer for Mobile Card Games

## Indie Developer Reference Guide

Date: July 2026

Prepared for: Solo and small-team indie game developers

Assumed experience: Intermediate familiarity with Unity, Godot, or a web stack (Node.js / React); general programming competence

Scope: This document covers the full implementation surface for 1v1 real-time and turn-based online multiplayer in mobile card games — including network architecture, state synchronization, matchmaking, disconnect handling, framework selection, and curated open-source references. It does not cover AI opponents, monetization, or app store submission.

## Executive Summary

The following findings represent the most actionable conclusions from this guide. Read the relevant sections for full context and implementation details.

Turn-based card games do not need rollback netcode. Unlike fighting games or real-time action games, card games operate on discrete events with no position interpolation. This eliminates the need for complex rollback or deterministic lockstep networking, dramatically simplifying your implementation. Standard WebSocket/TCP is the correct transport choice — not UDP.

Server-authoritative architecture is non-negotiable for hidden-information games. Each player's hand must be invisible to the opponent. Only a trusted server can enforce this boundary. Any peer-to-peer or client-hosted model that runs game logic on one player's machine leaks hand state and enables trivial cheating. Prioritize dedicated or authoritative server designs for any ranked mode.

Colyseus on Railway.app ($6/month) is the recommended MVP stack for solo indie developers. It provides a full authoritative WebSocket server, built-in per-room state filtering, a reconnect API (allowReconnection), and cross-platform client support (Unity, Godot, web). It deploys in under an hour with no DevOps experience required.

Reconnection handling is the most commonly skipped feature and the most complained-about bug. Mobile players switch networks, background apps, and lose signal constantly. Implement a grace window (15–60 seconds), issue reconnect tokens (high-entropy session IDs) at match start, and rehydrate full game state on reconnect. Frameworks with native support: Colyseus (allowReconnection), Photon Fusion 2 (ConnectionToken), Nakama (MatchJoinAttempt).

The simplest viable matchmaking for an indie title is a 4-character room code system. Skill-based matchmaking (ELO) requires a player base to function — without enough concurrent users it simply increases queue times without improving match quality. Launch with room codes and async invite links; add ELO bucket matching only after you have measurable DAU (daily active users).

## Table of Contents

2.1 Pure P2P with STUN/ICE

2.2 Relay Servers (Client-Host)

2.3 Dedicated / Authoritative Server

2.4 Comparison Table

## Section 1 — Architecture Overview: Why Turn-Based Card Games Are a Special Case

Before selecting a framework or writing a single line of networking code, it is worth understanding why turn-based card games have a fundamentally different networking profile than other multiplayer game genres. Most online multiplayer literature is written for real-time games — first-person shooters, racing games, fighting games — where bandwidth, tick rate, and latency dominate every design decision. Card games operate under a completely different set of constraints.

### Discrete Events, Not Continuous State

A card game's world state changes only when a player takes an action: play a card, draw a card, end a turn, activate an ability. Between actions, nothing changes. This means the server does not need to broadcast positional updates at 60 Hz or even 20 Hz. The network only needs to transmit when something happens. A busy 1v1 card game might produce fewer than 10 network messages per minute per player. Compare this to a first-person shooter, which must synchronize player position, rotation, and velocity many times per second for every player in the session.

This has two critical implications. First, bandwidth is essentially free — even a $5/month VPS can comfortably host hundreds of concurrent card game matches. Second, latency tolerance is high — a 200ms round-trip delay is imperceptible when a player is deciding which card to play, whereas the same latency would ruin a fighting game. This opens up far cheaper, simpler infrastructure options that would be completely unsuitable for real-time games.

### No Rollback Netcode Required

Rollback netcode (popularized by games like GGPO and Rollback.net) allows clients to speculatively simulate future frames and "roll back" to a known-good state when the server corrects a prediction error. It is essential for real-time fighting games where frame-accurate simulation matters. For a card game, it is pure complexity overhead with zero benefit. There are no frames to roll back, no physics to resimulate. The GDC talk "8 Frames in 16ms: Rollback Networking in Mortal Kombat and Injustice 2" (see Section 7) is cited in this guide specifically so you know what to explicitly avoid — not what to implement.

### WebSocket vs UDP — Why TCP Wins for Card Games

UDP (User Datagram Protocol) is favored in real-time games because packets can be dropped and the game continues — a lost position update is immediately superseded by the next one. Delivery order and guaranteed delivery are sacrificed for speed. For a card game, the opposite is true: every event must arrive, and must arrive in order. If a "draw card" message is lost and not retransmitted, the game state diverges permanently. WebSocket runs over TCP, which guarantees ordered, reliable delivery. This makes WebSocket the natural transport for card games — you get reliable delivery for free without implementing your own acknowledgment layer. WebSocket also traverses nearly all firewalls and NAT configurations without special handling, and is natively supported in every modern browser, Unity, Godot, and every mobile OS.

### Server-Authoritative Model Is Non-Negotiable

A server-authoritative model means that the server is the sole source of truth for all game state. Clients submit intentions (e.g., "I want to play card #7 on target #3") and the server validates, applies the action, and broadcasts the result. Clients never trust each other's state directly.

For a card game, this is not a preference — it is a hard requirement, for two reasons. First, hidden information: each player's hand must be invisible to the opponent. If either client has access to the full game state, a modified client can trivially expose the opponent's hand. Only a trusted server process that sends each player only their own hand state can enforce this boundary. Second, cheat prevention: card games are high-value targets for cheating. Playing invalid cards, manipulating deck order, and reading opponent hands are all trivially achievable if any game logic runs on a client machine. A server-authoritative model means the server rejects any action that violates game rules before it affects state visible to the opponent.

### The Hidden Information Problem: Per-Client State Filtering

Per-client state filtering is the process by which the server constructs a different view of the game state for each connected player. Player A receives: their own full hand, their own deck count (not content), all face-up board cards, all public game metadata. Player B receives: the same structure, but with Player A's hand contents replaced by a card count only. Neither player ever receives the other's hand. This filtering must happen at the server level, in the outbound serialization layer, before each message is dispatched. Production implementations of this pattern include Hearthstone's power.log format, which uses FULL_ENTITY, SHOW_ENTITY, HIDE_ENTITY, and TAG_CHANGE packets to describe exactly what each client is permitted to know about each entity at each moment. Colyseus implements this natively through its filterBy Schema decorator. Nakama implements it through per-client dispatch in match handlers.

## Section 2 — Network Topology Options: Relay Servers vs Peer-to-Peer

There are three primary topology options for a 1v1 online game. Each involves a different answer to the question: who routes the packets, and who runs the game logic?

### 2.1 Pure P2P with STUN/ICE

In pure peer-to-peer (P2P) networking, the two players' devices connect directly to each other — no server sits in the middle relaying packets. To establish this direct connection through the internet (which uses Network Address Translation, or NAT), a coordination process called ICE (Interactive Connectivity Establishment) is used. ICE uses a STUN server (Session Traversal Utilities for NAT) to discover each client's public IP and port, then attempts to establish a direct UDP channel between them.

When it works, P2P offers zero relay cost and the lowest possible latency (no intermediary hop). However, it fails on approximately 15–20% of real-world networks — specifically those behind symmetric NAT, which is common in corporate networks, some mobile carriers, and certain home routers. When STUN fails, a TURN server (Traversal Using Relays around NAT) is required as a fallback relay, which reintroduces server costs. Additionally, P2P exposes each player's real IP address to the opponent, creating privacy and harassment concerns. Most critically for card games, P2P with game logic on one peer is trivially exploitable. For these reasons, pure P2P is not recommended for card games in any mode where game integrity matters.

### 2.2 Relay Servers (Client-Host)

A relay server routes all packets between clients without running game logic. One player is typically designated as the "host" and runs the game logic locally; the other player's actions are relayed through the server to the host, and the host's state updates are relayed back. This solves NAT traversal (all players connect to the relay's public IP) and protects IP privacy.

However, the host-advantage problem remains: because game logic runs on the host player's machine, the host has zero network latency for their own actions and can potentially exploit this or modify the client process to cheat. For a casual card game without ranked stakes, this may be acceptable. For competitive play, it is not.

Free and low-cost relay options include:

Unity Relay (Unity Gaming Services) — integrated with Unity Lobby; free tier available; best for Unity projects already using UGS

Epic Online Services (EOS) Relay — free for all developers regardless of engine; includes NAT traversal and relay fallback

Photon Cloud free tier — supports up to 20 concurrent users (CCU) at no cost; includes relay infrastructure and SDKs for Unity and other engines

### 2.3 Dedicated / Authoritative Server

The gold standard. A dedicated authoritative server runs all game logic in a trusted process that neither player controls. Clients send only actions; the server validates, applies, and distributes results. No client ever has access to the full game state. This model completely eliminates host advantage and provides the strongest possible cheat resistance.

For a card game, the server computational load is minimal (validating card plays, updating state, serializing filtered views). A single $5–$10/month VPS can handle hundreds of concurrent matches. Managed options that reduce DevOps burden include:

Colyseus Cloud — managed hosting for Colyseus (Node.js) servers; horizontal scaling built in

Nakama (Heroic Labs) — self-hostable or managed; Go-based authoritative match server with persistent state

Railway.app — general-purpose PaaS; deploy a Colyseus or custom Node.js server for ~$6/month; no Docker knowledge required

Fly.io — similar to Railway; free tier available; supports global region deployment for lower latency

Dedicated server architecture is strongly recommended for any ranked, competitive, or monetized mode in a card game.

### 2.4 Topology Comparison Table

## Section 3 — State Synchronization for Turn-Based Card Games

### Event-Driven vs Full-State-Snapshot Approaches

There are two fundamental models for keeping clients in sync with server state. The event-driven (delta) model transmits only what changed: "Player A played card 7; Player B drew card 3; Player A's health is now 14." The full-state-snapshot model transmits the complete game state with every update: a serialized representation of every card, every health value, every flag, every turn counter. Most production systems use a hybrid: event-driven during normal play (small, frequent messages), plus a full snapshot on connect, reconnect, and at periodic checkpoints for consistency verification.

For a 1v1 card game, event-driven is strongly preferred for ongoing play. Card game state messages are typically small (a few hundred bytes), and sending only deltas keeps bandwidth near zero. Full snapshots are reserved for the reconnect flow described in Section 5.

### The Authoritative State Machine Pattern

Model your game as a finite state machine on the server. Define all valid states (e.g., WAITING_FOR_PLAYERS, PLAYER_A_TURN, PLAYER_B_TURN, RESOLVING_EFFECT, GAME_OVER) and all valid transitions between them. The server only processes an incoming action if the current state allows it — a card play submitted during the opponent's turn is rejected immediately with an error code, before any state mutation occurs. This pattern makes illegal state transitions architecturally impossible and simplifies debugging significantly, because the server's state at any moment is fully determined by the ordered sequence of validated actions applied to it.

### Idempotent Move IDs

Idempotency means that applying the same operation multiple times has the same effect as applying it once. This is critical for network reliability: on a mobile connection, a client may retransmit a move because the acknowledgment was lost, and the server must not apply the same move twice. The solution is to assign a UUID (universally unique identifier) to every move client-side, include it in the action message, and have the server deduplicate by UUID before processing. If the server has already applied move UUID a3f7…, it discards the duplicate and re-sends the acknowledgment. This is identical to the idempotency key pattern used by Stripe for payment API requests and applied by Lichess for its WebSocket message acknowledgment counters.

### Optimistic UI

Optimistic UI means the client plays the card animation and updates local visual state immediately when the player submits an action, without waiting for server confirmation. If the server rejects the action (illegal play, wrong turn, disconnection), the client smoothly reverts the animation and restores the pre-action visual state. This makes the game feel instantaneous and responsive even over a 150–200ms round-trip connection. For a card game, the revert case is rare (most submitted actions are legal), so the user experience improvement is significant with minimal complexity cost. Show a "ghost" animation of the card going to the board; revert with a slide-back animation if rejected.

### Per-Client State Filtering

As introduced in Section 1, the server must construct a separate view of game state for each player. Concretely, this means the outbound serialization layer checks the recipient's player ID before emitting any entity. Hand cards are serialized with full detail (card ID, attributes, art) for the owning player; they appear as {"hidden": true, "count": 4} (or simply omitted) in the opponent's view. Deck contents are never transmitted to any client — only deck size. Public information (board state, health, mana, turn number, discard pile) is identical in both views. The Hearthstone power.log packet format is the clearest public example: FULL_ENTITY reveals all attributes of a card (sent only to owning player or when the card becomes public); SHOW_ENTITY reveals a previously hidden card; HIDE_ENTITY hides a card that was previously visible; TAG_CHANGE updates a single attribute. Study this format even if you are not implementing a Hearthstone clone — it documents exactly which fields must be filtered and when.

### Message Format: JSON vs Binary

JSON is human-readable, easy to debug (you can inspect WebSocket frames in browser DevTools or Charles Proxy), and trivially supported in every language and framework. For a card game with small message payloads, JSON is perfectly adequate and strongly recommended during development. MessagePack and Protocol Buffers (Protobuf) are binary formats that produce significantly smaller payloads (often 40–60% smaller than equivalent JSON) and serialize/deserialize faster. They are worth adopting if profiling reveals that serialization is a bottleneck or if you are targeting very low bandwidth conditions. Do not start with binary formats — the debugging overhead early in development is not worth the marginal gains at indie scale.

### Full Resync on Reconnect

When a player reconnects after a disconnect (see Section 5 for the full reconnection flow), the server must transmit a complete state snapshot covering the current game state as the reconnecting player is permitted to see it: their hand, board state, opponent's face-up cards, deck sizes, health totals, turn number, whose turn it is, and remaining turn time. This snapshot is filtered for the reconnecting player identically to normal gameplay filtering. After receiving the snapshot, the client rebuilds its local state from scratch and resumes. Never attempt to "diff" state across a reconnect gap — always send a full, authoritative snapshot.

### Server-Side Turn Timer Enforcement

Turn timers must be enforced on the server, not the client. A client-enforced timer is trivially bypassed by modifying the client binary or pausing the process. The server starts a timer when a turn begins and automatically ends the turn (passing to the opponent) when the timer expires, regardless of client state. Common timer durations for card games: 30–90 seconds per turn for synchronous play; 24–72 hours per turn for asynchronous play. The server must also handle the case where a client submits an action after the server has already timed out the turn — this action should be rejected with a TURN_EXPIRED error code.

### Lichess Architecture Reference

The open-source Lichess chess platform (lichess.org) is one of the most thoroughly documented and battle-tested examples of WebSocket-based turn-taking game architecture. It uses a persistent WebSocket connection per game, message acknowledgment counters (each client tracks the last acknowledged server message ID and can request retransmission), and full state resync on reconnect. Because Lichess handles millions of games per day on modest infrastructure, its approach demonstrates that simple, reliable WebSocket architecture scales far beyond any indie title's requirements. Study its open-source repository (GitHub: lichess-org/lila) for reference on acknowledgment patterns, move validation, and game lifecycle management.

## Section 4 — Matchmaking

### Room Code Approach

The simplest possible matchmaking is a 4–6 character alphanumeric room code (or invite code). Player A creates a match, the server generates a short code (e.g., KXTQ), Player A shares it with Player B via any external channel (messaging app, social media, QR code), and Player B enters the code to join. This requires zero matchmaking infrastructure, works at any scale (including 2 concurrent users), and is perfectly suited to a game with a small or growing player base. QR code generation for the room code is a one-library addition and dramatically improves mobile UX.

### Skill-Based Matchmaking (ELO)

ELO rating assigns each player a numerical skill score that increases with wins against stronger opponents and decreases with losses against weaker ones. A simple ELO matchmaker groups players into skill buckets (e.g., 0–999, 1000–1199, 1200–1399, etc.) and matches players within the same bucket, expanding the bucket width as queue time increases. This is appropriate once you have enough concurrent users that random matching produces skill-mismatched games. The math for ELO updates is simple:

New Rating = Old Rating + K × (Actual Score − Expected Score), where K is typically 32 for new players and 16 for established players, Actual Score is 1 for a win and 0 for a loss, and Expected Score is derived from the rating difference between the two players.

Do not implement ELO matchmaking before you have at least 20–30 concurrent users. Below that threshold, it will increase queue times without meaningful match quality improvement.

### Lobby Systems

Most major networking frameworks include a lobby or room browser component:

Unity Lobby Service (Unity Gaming Services) — lobby metadata (room codes, player counts, game mode tags), filterable by custom properties; pairs with Unity Relay for hosting

Photon Lobby — room list browsing with filtering; built into Photon PUN 2 and Fusion 2; included in free tier

Nakama Matchmaker — query-based matchmaking with custom properties (skill range, game mode, region); supports async notifications when a match is found

Colyseus Rooms — rooms are created and discovered via the Colyseus matchmake API; supports custom filter queries and room metadata

### Asynchronous Matchmaking

For a turn-based card game, players do not need to be online simultaneously for matchmaking to succeed. Asynchronous matchmaking allows a player to submit a match request, close the app, and receive a push notification when an opponent is found. The match then proceeds asynchronously: each player takes their turn when available, and the server holds state indefinitely between turns. This dramatically increases effective player pool size and removes the frustration of long queue wait times. Push notifications can be implemented via Firebase Cloud Messaging (FCM) for Android and Apple Push Notification service (APNs) for iOS, both of which integrate straightforwardly with Node.js backends via the firebase-admin SDK.

### Timeout and Re-Queue Logic

If a player queues for matchmaking and no opponent is found within a configurable timeout (e.g., 60 seconds for synchronous, 24 hours for async), the server should remove the player from the queue and notify them. Clients should display queue time and offer a cancel option. For synchronous queuing, automatically suggest room-code sharing as an alternative when queue time exceeds 30 seconds.

### Matchmaking Solutions Comparison

## Section 5 — Handling Disconnects and Reconnection

Disconnection handling is the feature most commonly skipped in indie multiplayer implementations and the most frequently cited complaint in player reviews. Mobile networks are unreliable by design. Players switch from WiFi to cellular, enter tunnels, background the app, receive phone calls, and drop connections routinely. A multiplayer card game that ends the match on disconnect — or worse, crashes — will lose users immediately. This section documents the complete pattern for graceful disconnect handling.

### The Grace Window Pattern

When the server detects a player disconnection (WebSocket close or ping timeout), it should not immediately end the match or award victory to the opponent. Instead, it enters a grace window: a configurable hold period (typically 15–60 seconds) during which the disconnected player's slot is reserved. The opponent is notified ("Opponent disconnected — waiting for reconnect…") and the turn timer is paused. If the player reconnects within the grace window, the match resumes seamlessly. If the grace window expires without reconnection, the opponent wins by forfeit, and the result is recorded server-side. A 30-second window is a reasonable default for mobile card games — long enough for a network switch, short enough not to leave the opponent waiting indefinitely.

### Reconnect Tokens and Session IDs

At match start, the server issues each player a reconnect token: a high-entropy, cryptographically random string (minimum 128 bits of entropy, expressed as a UUID or hex string) that acts as a bearer credential for that player's match slot. This token is stored client-side (in memory or secure persistent storage) and submitted with the reconnect request. The server validates the token, confirms the grace window has not expired, and restores the player to their original slot. The token must expire when the grace window closes or when the match ends.

Never use predictable values (player ID alone, match ID alone, or a sequential counter) as reconnect tokens — these are trivially guessable and allow slot hijacking. The token must be treated as a secret credential for the duration of the match.

### State Rehydration on Reconnect

Upon successful token validation, the server performs a full state resync as described in Section 3: it transmits a complete, per-client-filtered snapshot of the current game state. The client discards any local state and rebuilds from the snapshot. After the snapshot is acknowledged, the server unpauses the turn timer and notifies both clients that the match is resuming.

### Framework-Specific Reconnect APIs

Colyseus: room.allowReconnection(client, seconds) — holds the player's slot for the specified number of seconds; the client reconnects using the same session ID stored in the room. The Colyseus client SDK handles token storage automatically.

Photon Fusion 2: ConnectionToken — a byte array set per-player at session start; on reconnect, the same token is submitted and Fusion maps the new connection to the original player slot. Configure PlayerTTL to set the grace window duration in milliseconds.

Nakama: MatchJoinAttempt hook — called when a player attempts to join a match; allows the server to recognize a returning player by their user ID or a stored presence key and restore their slot.

Unity Netcode for GameObjects (NGO): No native reconnect support. Implement manually using a GUID-to-slot mapping stored server-side; on reconnect, the client submits its GUID, the server looks up the slot, and re-assigns the ClientId.

Mirror Networking: Similar to NGO — no native reconnect; requires custom GUID mapping and state resync implementation.

### Mobile-Specific Disconnection Challenges

Mobile introduces several disconnect scenarios not present on desktop:

App backgrounding: On Android, backgrounded apps may continue running sockets briefly; on iOS, sockets are suspended almost immediately when the app backgrounds. iOS apps cannot maintain a persistent WebSocket connection while backgrounded. Design your grace window with iOS suspension in mind — the app may not send a clean disconnect before the socket closes.

WiFi-to-cellular handoff: When a device moves from a WiFi network to cellular (or vice versa), the IP address changes and the existing WebSocket connection is terminated. The client must detect this (via network change callbacks on both Android and iOS) and initiate a reconnect with its stored token.

iOS app suspension: iOS may suspend background apps after a few seconds. If the player switches to another app mid-turn, the connection will drop. Always issue a push notification to the suspended player before the grace window expires, prompting them to return to the game.

### Anti-Patterns to Avoid

## Section 6 — Frameworks, Libraries, and Engines

The following profiles cover the eight most relevant frameworks for indie mobile card game multiplayer as of mid-2026. Each is evaluated on practical criteria for solo and small-team developers.

### Framework Profiles

Unity Netcode for GameObjects (NGO)

First-party Unity networking SDK, maintained by Unity Technologies. Integrates natively with Unity Relay, Unity Lobby, and Unity Authentication (all part of Unity Gaming Services). Free with any Unity license. Uses a Host-Client model by default (one player acts as relay host), but supports dedicated server mode with Unity's Game Server Hosting (Multiplay) service. Best suited for Unity developers who want tight UGS integration and access to the free relay tier. Lacks native reconnect support — implement manually with GUID mapping. Not suitable for self-hosted authoritative backends without significant additional work.

Mirror Networking

Open-source, community-maintained Unity networking library (MIT license). A spiritual successor to the deprecated UNET. Supports multiple transport layers including Telepathy (TCP) and KCP (UDP-based reliable transport). Uses SyncVar for automatic variable synchronization and [ClientRpc] / [Command] attributes for RPC calls. No built-in relay — must integrate with third-party relay services manually. Excellent documentation and large community. Suitable for developers who want full control without vendor lock-in. Reconnect requires custom implementation.

Photon Fusion 2

The newest Photon networking SDK (2024+), supporting both Shared Mode (no dedicated server) and Client-Server Mode. Introduces ConnectionToken for robust reconnection and PlayerTTL for grace window configuration. Free up to 20 CCU (concurrent users); paid tiers above that. Managed cloud relay included. Significantly more complex than PUN 2 but more powerful. Best for Unity developers who need a managed relay with reconnect support and are approaching or expecting to exceed 20 CCU.

Photon PUN 2 (Legacy)

The older, widely-documented Photon Unity Networking SDK. Room-based architecture with simple room-code-style APIs. Not actively developed (Photon is directing new projects toward Fusion 2), but remains stable and has the largest body of tutorials and Stack Overflow answers of any Unity networking library. Free up to 20 CCU. Ideal for a quick casual card game MVP where simplicity and documentation availability outweigh modernity. PUN 2 does not support server-side game logic — game state runs on the host client.

Colyseus

Node.js/TypeScript authoritative game server framework (open-source, MIT license). Room-based lifecycle (onCreate, onJoin, onLeave, onDispose). Schema-based state with built-in per-client filtering via filterBy decorator. WebSocket transport. Self-hostable on any Node.js platform or managed via Colyseus Cloud. Client SDKs available for Unity, Godot, Defold, Phaser, and pure JavaScript/TypeScript. allowReconnection(client, seconds) provides native grace window support. Ideal for cross-platform card games targeting web and mobile simultaneously. The recommended framework for solo indie developers building an authoritative card game backend.

Nakama (Heroic Labs)

Open-source (Apache 2.0) game server written in Go, with TypeScript/JavaScript runtime for server-side logic. Self-hostable via Docker or Nakama Cloud managed hosting. Provides persistent user accounts, friends/social graph, leaderboards, tournaments, in-app notifications, in-game storage, and a turn-based match API. The turn-based match API maintains in-memory match state with automatic persistence to PostgreSQL on each turn, making it the most durable option for async card games. Matchmaker supports ELO-like numeric properties for skill-based queuing. Most feature-complete indie backend available. Recommended for any card game that needs persistent player profiles, leaderboards, or async play as core features.

Socket.io + Node.js

Maximum flexibility, minimum opinion. Socket.io provides WebSocket + polling transport with automatic fallback, rooms, namespaces, and event broadcasting. Node.js provides the runtime. All game logic, matchmaking, state management, and reconnect handling are custom-built. Cheapest possible infrastructure — any $5/month VPS running Node.js suffices. Ideal for web-first card games (browser + mobile browser) or developers who want complete control and are comfortable writing backend code. Requires the most implementation work of any option listed here. No built-in matchmaking, reconnect tokens, or state sync — everything is hand-rolled.

Godot 4 MultiplayerAPI

Godot's built-in high-level multiplayer API, using ENet (UDP-based) as the default transport, with WebSocket transport available as an alternative via WebSocketMultiplayerPeer. Supports @rpc annotations for remote procedure calls and MultiplayerSynchronizer for property sync. No built-in relay infrastructure — developers must use a dedicated server or integrate with a third-party relay. The TRUCO-godot open-source project (see Section 7) demonstrates a full card game ECS framework built on Godot 4 MultiplayerAPI, including a custom TurnMachine and Replicator for state sync. Recommended for Godot-committed developers building a card game with a self-hosted dedicated server.

### Framework Comparison Table

## Section 7 — Tutorials, Devlogs, and Open-Source Examples

The following resources are curated for relevance to 1v1 mobile card game multiplayer. Each entry includes a description of what it covers and why it is useful, followed by its source reference in Section 9.

### Open-Source Projects

Unity Multiplayer Card Game Tutorial Series — cajonsun (2025)

A 35-episode tutorial series using Unity Netcode for GameObjects, covering the complete match lifecycle of a 1v1 card game: lobby creation, room codes, turn management, network-synchronized card exchange, hand management, and UI binding to network state. Available as both YouTube videos and a companion GitHub repository with full source code. One of the most complete public Unity card game networking references available. Useful for developers learning NGO's host-client model and Unity Lobby/Relay integration.

Card Duel — ritheshrao197 (GitHub)

Unity 1v1 turn-based card game demonstrating a server-authoritative architecture with JSON-only networking. Implements a 6-turn match with full reconnection handling, event-driven architecture (game events dispatched via a central event bus), and Android build support. Clean, readable reference implementation suitable for developers who want to study authoritative card game flow without framework complexity.

TurnBasedMultiplayerGame — zeniaKaram (GitHub)

Unity 6 prototype using Mirror Networking. Features a JSON-driven card data system (cards defined in ScriptableObjects serialized to JSON), an event-driven architecture for game flow, and clear separation between networking layer, game logic, and UI. Demonstrates Mirror's SyncVar and [Command] patterns applied to card game state. Useful for Mirror users looking for a card-specific reference.

TRUCO-godot — nitsuboy (GitHub)

Godot 4 multiplayer framework purpose-built for card games, implementing a hybrid ECS+OOP architecture. Components include: a Replicator for state synchronization across clients, a TurnMachine for turn management, a RulePack for server-side move validation, and UDP discovery for LAN play. Models the game of Truco (a popular Brazilian card game) but the framework is general-purpose. Valuable for Godot developers wanting a production-quality card game networking skeleton.

guandan-online — xingfanxia (GitHub)

Repository accompanying deep-dive research into real-time card game synchronization protocols. Analyzes the published networking architectures of Lichess, Hearthstone, PokerStars, and Mahjong Soul. Recommends WebSocket + JSON for indie card games, idempotent move IDs, and optimistic UI with ghost animations. The research documents are among the most thorough public analyses of production card game networking available. Read the research directory even if you are not implementing the specific game.

### Web Stack References

Multiplayer Card Game with React + Java + WebSockets — honzaa.cz (Devlog)

Case study for a web-first card game built with React frontend and a Java WebSocket backend (using Spring Boot). Documents the decision to use WebSocket over long-polling, implementation of reconnect tokens stored in localStorage, and a 5-minute limbo hold (grace window) for disconnected players. Useful for developers building browser-first or web-stack card games who want to see a non-Node.js backend implementation.

Socket.io Card Game Case Study — The Web People

Implements a card game using Next.js (React) on the frontend and Socket.io/Node.js on the backend. Covers JWT-based session tokens for reconnect, QR code room-code generation, server-authoritative move validation, and in-memory state management with a Redis migration path for scaling. Practical guide for developers choosing the Socket.io stack.

Colyseus Card Game Architecture — NewAgeSysIT

Article providing a deep dive into the Colyseus Room lifecycle as applied to a card game. Covers per-client state filtering for hidden hands using the Colyseus Schema filterBy decorator, horizontal scaling via Colyseus' built-in process separation, and room state serialization. Recommended reading before starting any Colyseus card game project.

### Unity-Specific Guides

Build & Deploy Mobile Multiplayer Unity — Tutorial Man (Medium, Nov 2025)

End-to-end guide covering Unity Netcode for GameObjects with Unity Transport, Unity Relay and Lobby integration, and Android/iOS build configuration. Documents common pitfalls including Relay region selection, iOS entitlement configuration for background networking, and the Relay vs Photon cost comparison at various CCU levels.

Handling Disconnects & Reconnection in Unity — Crux Blog

Focused reference on the disconnect/reconnect problem in Unity multiplayer. Covers reconnect token architecture, grace window implementation, and a framework cheat sheet comparing Colyseus allowReconnection, Photon Fusion ConnectionToken, NGO GUID mapping, and Nakama MatchJoinAttempt. Recommended reading before implementing any reconnect logic.

Photon Fusion Disconnect & Reconnect Sample — Photon Engine Docs (2025)

Official Photon documentation sample demonstrating reconnect in both Client-Host and Shared Mode. Shows ConnectionToken setup, PlayerTTL configuration, and the reconnect flow from both client and server perspectives. The authoritative reference for Photon Fusion reconnection implementation.

### Architecture and Research

MY.GAMES Unity Realtime Multiplayer Series Part 6 — Medium

Part of a multi-article series on Unity multiplayer architecture. Part 6 specifically explains P2P, relay server, and dedicated server topologies with annotated Unity code examples. Useful for understanding the trade-offs between topologies with concrete implementation context.

AccelByte: P2P vs Relay vs Dedicated Servers — accelbyte.io

Engineering breakdown of the three topology options with quantified trade-offs. Covers Epic Online Services free relay, Unity Relay, and Steam relay as no/low-cost options. One of the clearest topology comparison articles available for indie developers.

Nakama vs Photon Comparison — Heroic Labs Docs

Feature-by-feature comparison table. Key findings: Nakama leads on turn-data persistence, matchmaking customization, and self-hosting; Photon leads on managed hosting simplicity and Unity ecosystem documentation depth. Useful for developers deciding between the two most feature-complete indie backends.

### GDC Talks (Context and Contrast)

GDC: Applying AlphaZero to Turn-Based Card Games — NetEase (GDC 2021)

Covers 1v1 card game architecture at production mobile scale for Revelation Mobile. Relevant sections include board state representation, hidden hand encoding strategy for server-authoritative systems, and server-side move validation pipeline. Useful for understanding what production-scale card game networking looks like and what design decisions are made under commercial constraints.

GDC: 8 Frames in 16ms — Rollback Networking (NetherRealm, Michael Stallone)

The authoritative reference for rollback netcode as used in Mortal Kombat and Injustice 2. Cited here explicitly as a contrast: this technique is for real-time fighting games and is completely inapplicable to turn-based card games. Reading the first 10 minutes of this talk will concretely illustrate why card games do not need rollback and confirm that simpler, reliable TCP-based approaches are correct.

## Section 8 — Decision Framework: Picking Your Stack

Use the following decision tree to identify the most appropriate stack for your project. Answer each question in order; stop at the first match.

### Decision Tree

Is your game web-first (browser target, possibly mobile web)?
 → Yes: Use Socket.io + Node.js (maximum flexibility, cheapest infrastructure) or Colyseus (authoritative, built-in state sync). Colyseus is preferred if you want room lifecycle management and per-client filtering without building it yourself.

Are you using Unity and targeting casual / non-ranked play on a tight budget?
 → Yes: Use Unity Netcode for GameObjects + Unity Relay (first-party, free tier, tight UGS integration) or Photon PUN 2 (most documented, 20 CCU free, fastest to working prototype). PUN 2 wins on documentation density; NGO wins on Unity ecosystem alignment.

Are you using Unity and targeting competitive / ranked play?
 → Yes: Use Colyseus or Nakama as an authoritative backend with a Unity client connecting via WebSocket or the Nakama Unity SDK. Both enforce server-side game logic and hand filtering. Colyseus is simpler; Nakama adds persistent accounts, leaderboards, and async APIs.

Are you using Godot?
 → Yes: Use Godot 4 MultiplayerAPI with WebSocket transport for the client layer, and a self-hosted Colyseus or Nakama backend for authoritative logic. Reference the TRUCO-godot framework for card-game-specific ECS patterns.

Do you need persistent player accounts, leaderboards, friends, tournaments, or async play as core features?
 → Yes: Use Nakama. It is the only indie-accessible option that includes all of these out of the box. Self-host on Docker ($10–20/month including PostgreSQL) or use Nakama Cloud managed hosting.

Do you want the smallest possible MVP with minimum setup time?
 → Yes: Use Photon PUN 2. Room codes, relay hosting, and a working 1v1 prototype can be achieved in one weekend. Free up to 20 CCU. When you outgrow PUN 2 (traffic, ranked mode, anti-cheat), migrate the server logic to Colyseus or Nakama.

### Recommended MVP Architecture for a Solo Indie Developer

## Section 9 — Key Takeaways and Action Items

Confirm your topology before writing any game code. The choice between relay-hosted and dedicated-authoritative architecture determines every subsequent decision: framework, hosting, state model, and anti-cheat capability. For any game with ranked modes or real money, choose dedicated authoritative. For a casual MVP, relay is acceptable.

Implement server-side game logic from day one. Retrofitting server authority onto a client-logic game is among the most painful refactors in multiplayer development. Design your game state machine on the server first; treat clients as display layers that submit actions and render results.

Use WebSocket over TCP for your transport layer. Do not use raw UDP for a card game. WebSocket provides reliable, ordered delivery; traverses firewalls; and is natively supported in every relevant platform. You will not miss UDP's benefits and you will appreciate TCP's guarantees.

Assign a UUID to every player action and deduplicate server-side. This single pattern prevents an entire class of state-divergence bugs caused by network retransmission. It costs one hash map lookup per action on the server.

Issue reconnect tokens at match start and implement a grace window before match ends. Do this before shipping. Mobile players will disconnect — it is not an edge case. A 30-second grace window and a session token are a day's work; skipping them costs you user retention.

Filter game state per-client at the server's outbound serialization layer. Never send a player's hand to the opponent. Implement this as a structural constraint in your server code, not as a "we will remember not to" convention. Use Colyseus filterBy, Nakama per-client dispatch, or explicit serialization branches.

Enforce turn timers server-side. Client-enforced timers are easily bypassed. A simple setTimeout on the server that calls endTurn() is all that is required. This also handles the case where a client crashes mid-turn.

Start with room codes; add ELO matchmaking only after you have a player base. ELO requires enough concurrent players to function. With fewer than 20–30 concurrent users, ELO increases queue times without improving match quality. Launch with invite codes, measure DAU, then add matchmaking.

Profile before optimizing message format. JSON is fine for a card game at indie scale. Do not spend time implementing MessagePack or Protobuf until profiling demonstrates that serialization is a measurable bottleneck. Card game messages are small; bandwidth is not your constraint.

Test disconnect and reconnect on real mobile hardware before launch. Toggle airplane mode mid-match, switch WiFi networks, background the app mid-turn, and receive a phone call during a game. Each of these should result in a clean reconnect, not a broken match state. Automate this as part of your pre-launch checklist.

## References

[1] cajonsun. Unity Multiplayer Card Game Tutorial Series (35 episodes). Unity Discussions / YouTube / GitHub, 2025. GitHub: https://github.com/cajonsun/multiplayer-card-game

[2] ritheshrao197. Card Duel — Unity 1v1 Turn-Based Card Game. GitHub, 2024. https://github.com/ritheshrao197/card-duel

[3] zeniaKaram. TurnBasedMultiplayerGame — Unity 6 + Mirror Networking. GitHub, 2025. https://github.com/zeniaKaram/TurnBasedMultiplayerGame

[4] nitsuboy. TRUCO-godot — Godot 4 ECS Multiplayer Card Game Framework. GitHub, 2024. https://github.com/nitsuboy/truco-godot

[5] xingfanxia. guandan-online — Real-Time Card Game Sync Research. GitHub, 2024. https://github.com/xingfanxia/guandan-online

[6] Honza A. Multiplayer Card Game with React + Java + WebSockets. honzaa.cz (devlog), 2024. https://honzaa.cz/multiplayer-card-game

[7] The Web People. Socket.io Card Game Case Study — Next.js + Socket.io. thewebpeople.dev, 2024. https://thewebpeople.dev/socket-io-card-game

[8] NewAgeSysIT. Colyseus Card Game Architecture — Room Lifecycle and Per-Client State Filtering. newagesysit.com, 2024. https://newagesysit.com/colyseus-card-game-architecture

[9] Tutorial Man. Build & Deploy Mobile Multiplayer Unity — End-to-End Guide. Medium, November 2025. https://medium.com/@tutorialman/build-deploy-mobile-multiplayer-unity

[10] Crux Blog. Handling Disconnects & Reconnection in Unity Multiplayer. crux.gg/blog, 2025. https://crux.gg/blog/handling-disconnects-reconnection-unity

[11] Photon Engine. Fusion Disconnect & Reconnect Sample — Official Documentation. doc.photonengine.com, 2025. https://doc.photonengine.com/fusion/current/manual/reconnect

[12] MY.GAMES. Unity Realtime Multiplayer Series, Part 6: Network Topologies. Medium, 2024. https://medium.com/mygames-engineering/unity-realtime-multiplayer-part-6

[13] AccelByte. P2P vs Relay vs Dedicated Servers — Engineering Breakdown. accelbyte.io, 2024. https://accelbyte.io/blog/p2p-vs-relay-vs-dedicated-servers

[14] Heroic Labs. Nakama vs Photon — Feature Comparison. heroiclabs.com/docs, 2025. https://heroiclabs.com/docs/nakama/concepts/comparison/photon

[15] NetEase Games / Revelation Mobile Team. Applying AlphaZero to Turn-Based Card Games. GDC 2021. https://gdcvault.com/play/1027012

[16] Stallone, Michael (NetherRealm Studios). 8 Frames in 16ms: Rollback Networking in Mortal Kombat and Injustice 2. GDC 2018. https://gdcvault.com/play/1023220

[17] Lichess (lichess-org). lila — Open-Source Lichess Server (WebSocket Architecture Reference). GitHub. https://github.com/lichess-org/lila

[18] Colyseus. Colyseus — Multiplayer Game Framework for Node.js. Official documentation, 2025. https://docs.colyseus.io

[19] Heroic Labs. Nakama — Open-Source Game Server Documentation. heroiclabs.com, 2025. https://heroiclabs.com/docs

[20] Unity Technologies. Unity Netcode for GameObjects — Official Documentation. docs.unity3d.com, 2025. https://docs-multiplayer.unity3d.com/netcode/current/about

[21] Mirror Networking. Mirror — Open-Source Networking for Unity. mirror-networking.gitbook.io, 2025. https://mirror-networking.gitbook.io/docs

[22] Photon Engine. Photon Fusion 2 — SDK Documentation. doc.photonengine.com, 2025. https://doc.photonengine.com/fusion/v2

[23] Blizzard Entertainment. Hearthstone power.log Packet Format Reference. (Community documentation / reverse engineering). hearthsim.info, 2023. https://hearthsim.info/docs/hslog

1v1 Online Multiplayer for Mobile Card Games — Indie Developer Reference Guide. Compiled July 2026. All framework versions, pricing tiers, and free CCU limits are subject to change by their respective vendors. Verify current terms before project commencement.

| Criteria | Pure P2P (STUN/ICE) | Relay Server (Client-Host) | Dedicated Authoritative Server |

| --- | --- | --- | --- |

| NAT Traversal | Works ~80–85% of the time; fails on symmetric NAT | Yes — all clients connect to relay's public IP | Yes — all clients connect to server's public IP |

| Cheating Resistance | Poor — game logic on client; hand state accessible | Moderate — host can still cheat; no server validation | Strong — server validates all moves; no client trust |

| Cost | Near zero (STUN servers free; TURN adds cost) | Low — free tiers available (Photon, EOS, Unity Relay) | Low-moderate — $5–10/mo VPS or managed cloud |

| Implementation Complexity | Moderate-High (ICE negotiation, NAT fallback logic) | Low (SDKs handle connection; minimal custom code) | Moderate-High (write server game logic, deploy, maintain) |

| IP Privacy | Poor — real IPs exposed to opponent | Good — relay hides IPs | Good — server hides IPs |

| Host Advantage | Yes — initiating peer has advantage | Yes — host runs game logic locally | None — server is neutral third party |

| Hidden Hand Enforcement | Not enforceable | Not enforceable (host sees all) | Fully enforceable via per-client filtering |

| Recommended For | LAN play, local-only prototypes | Casual non-ranked mobile games, rapid MVPs | Any ranked, competitive, or monetized game mode |

| Warning Never apply optimistic UI to any action that has hidden information consequences — for example, revealing a face-down card or drawing from a deck. These must always wait for server confirmation and the server-provided card identity before displaying anything. Only animate the motion; wait for the identity. |

| --- |

| Solution | Free Tier | Built-in ELO | Async Support | Engine Integration | Self-Hostable |

| --- | --- | --- | --- | --- | --- |

| Unity Lobby Service | Yes (generous) | No (custom) | No (polling) | Unity only | No (managed) |

| Photon Lobby (PUN2/Fusion) | Yes (20 CCU) | No | No | Unity, Unreal, custom | No (managed) |

| Nakama Matchmaker | Yes (self-hosted) | Yes (built-in query) | Yes (notifications) | Unity, Godot, Unreal, web | Yes |

| Colyseus Rooms | Yes (self-hosted) | No (custom) | Limited | Unity, Godot, Defold, web | Yes |

| Socket.io (custom) | Yes (self-hosted) | No (fully custom) | Yes (custom) | Web-first, any via ws | Yes |

| Epic Online Services | Yes (all tiers) | Yes (built-in) | Yes | Unity, Unreal, custom | No (managed) |

| Warning — Common Anti-Patterns •  Despawning the player immediately on disconnect. This destroys game state and makes reconnection impossible. Hold the slot. •  Not holding the match slot. If the server removes the player from the room instantly, there is nothing to reconnect to. •  Client-side grace window logic. The opponent's client must not be the one that decides when to forfeit the disconnected player — only the server can reliably enforce the grace window, as the opponent's client may itself disconnect. •  Storing reconnect tokens in plaintext local storage on web. Use sessionStorage or a secure in-memory store; tokens should not persist across browser sessions. •  Not notifying the connected opponent. The waiting player must see a clear "Opponent reconnecting…" message, or they will assume the game is broken and close the app themselves. |

| --- |

| Framework | Language | License / Cost | Transport | Relay Included | Self-Hostable | Mobile Support | Best For |

| --- | --- | --- | --- | --- | --- | --- | --- |

| Unity NGO | C# | Free (Unity license) | TCP/UDP (Unity Transport) | Yes (Unity Relay) | Partial (UGS dependency) | iOS, Android | Unity + UGS hosted relay |

| Mirror Networking | C# | Free (MIT) | TCP (Telepathy), UDP (KCP), WebSocket | No (3rd party) | Yes | iOS, Android | Unity, full control, no lock-in |

| Photon Fusion 2 | C# | Free ≤20 CCU; paid above | UDP (reliable) | Yes (Photon Cloud) | No (managed) | iOS, Android | Unity, reconnect support, competitive |

| Photon PUN 2 | C# | Free ≤20 CCU; paid above | UDP (reliable) | Yes (Photon Cloud) | No (managed) | iOS, Android | Unity casual game MVP, best docs |

| Colyseus | TypeScript (server), multi (client) | Free (MIT); Colyseus Cloud paid | WebSocket (TCP) | No (server IS authoritative) | Yes | iOS, Android, Web | Cross-platform authoritative backend |

| Nakama | Go (server), TypeScript runtime | Free (Apache 2.0); managed paid | WebSocket, gRPC | No (server IS authoritative) | Yes | iOS, Android, Web | Full indie backend — accounts, async, ELO |

| Socket.io + Node.js | JavaScript / TypeScript | Free (MIT) | WebSocket + polling | No | Yes | Web, any via ws client | Web-first, maximum flexibility |

| Godot 4 MultiplayerAPI | GDScript / C# | Free (MIT) | ENet (UDP), WebSocket | No (3rd party or custom) | Yes | iOS, Android | Godot projects, self-hosted server |

| Recommended Solo MVP Stack This configuration provides a complete, production-ready 1v1 card game backend for under $10/month with minimal DevOps burden: •  Server: Colyseus (Node.js / TypeScript) — authoritative room-based game server •  Hosting: Railway.app (~$6/month) or Fly.io (free tier available) — no Docker or Kubernetes knowledge required; deploy from GitHub repository •  Client: Unity 6 or Godot 4 — using Colyseus client SDK •  Transport: WebSocket (TCP) over port 443 (WSS) — traverses all mobile firewalls •  Message format: JSON during development; migrate to MessagePack if profiling shows need •  Matchmaking: 4-character room codes at launch; add Colyseus matchmake queuing when DAU supports it •  Reconnect: allowReconnection(client, 30) — 30-second grace window; client stores session ID at match start •  State sync: Event-driven during play; full snapshot on connect and reconnect •  Turn timer: Server-side setTimeout in Colyseus room, auto-end turn on expiry •  Hidden hand enforcement: Colyseus Schema filterBy decorator on hand card array Total estimated setup time for a working 1v1 prototype: 2–4 days for a developer with TypeScript and Unity/Godot experience. |

| --- |