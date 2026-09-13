# Chatn't v4

## Run
1. Open a terminal in this folder.
2. Run `npm.cmd install` once.
3. Run `npm.cmd start`.
4. Open http://localhost:3000 in two browser windows.

The terminal is only the backend. Chat messages are NOT printed there.

## Behavior
- Each browser window chooses its own name and receives its own six-character Chatn't ID.
- Online recipient -> Chat mode.
- Offline recipient -> Letter mode.
- The chat message is heavily scrambled with character shuffling, word shuffling, special characters and emojis.
- The original message is never shown in the chat.
- Letters are represented in chat by a small "LETTER SENT / LETTER RECEIVED — Click to view" card.
- Sent letters also live in the LEFT "LETTERS SENT" folder.
- Clicking a letter opens a parchment popup over the SPACE background.
- The parchment uses an irregular torn/scroll outline inspired by the supplied reference.
- Sending a letter launches a paper plane.
- The recipient receives the scrambled letter after reconnecting.
- Letter popup is the only parchment area; the normal application background stays space-themed.

## Important
This is a hackathon prototype. Data is stored in server memory, so restarting the Node server clears active conversations and waiting letters.
