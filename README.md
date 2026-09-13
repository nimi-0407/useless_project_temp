<img width="1280" height="640" alt="Chatn't" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# Chatn't 🎯

> **You know what you said. They don't.**

## Basic Details

### Team Name: Codepoint

### Team Members

- Team Lead: **Rose Mathew** - Mar Athanasius College of Engineering, Kothamangalam
- Member 2: **Nimisha Brijit Joshy** - Mar Athanasius College of Engineering, Kothamangalam

### Project Description

**Chatn't** is a real-time messaging application where perfectly understandable messages are deliberately transformed into complete nonsense before reaching the receiver.

The sender sees exactly what they typed, while the receiver gets a chaotic version containing scrambled characters, symbols and emojis. The amount of chaos can be controlled using the Chaos slider.

### The Problem (that doesn't exist)

Modern messaging applications have made communication far too easy.

You type:

> "Are you coming to the hackathon?"

and the other person actually understands you.

This is clearly unacceptable.

### The Solution (that nobody asked for)

Chatn't solves this completely unnecessary problem by destroying your messages before they reach the receiver.

The sender sees the original message.

The receiver gets something like:

> `¤ yΩu ~ c?ming 👽 ha§kathon ∿ 🗿 ???`

Because sometimes, being understood is overrated.

---

## Technical Details

### Technologies/Components Used

### For Software:

- **Languages used**
  - HTML
  - CSS
  - JavaScript

- **Frameworks used**
  - Node.js
  - Express.js

- **Libraries used**
  - Socket.IO

- **Tools used**
  - Visual Studio Code
  - Git
  - GitHub
  - Web Browser

### For Hardware:

- No hardware components were used.
- Chatn't is a completely software-based project.

---

## Implementation

### For Software:

Chatn't uses a client-server architecture.

The frontend runs in the browser and communicates with a Node.js server using Socket.IO.

When a message is sent:

1. The sender types a normal message.
2. The message is sent to the Node.js server.
3. The server creates a corrupted version of the message.
4. The sender receives the original message.
5. The receiver receives only the corrupted version.
6. The Chaos Level controls how heavily the message is distorted.

### Message Flow

text
                  ┌──────────────────┐
                  │      Sender      │
                  │                  │
                  │ "Hello Nimisha!" │
                  └────────┬─────────┘
                           │
                           │ Socket.IO
                           ▼
                 ┌─────────────────────┐
                 │    Node.js Server   │
                 │                     │
                 │   Chaos Generator   │
                 │         🤪          │
                 └─────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
     ┌─────────────────┐       ┌──────────────────┐
     │     Sender      │       │     Receiver     │
     │                 │       │                  │
     │ "Hello Nimisha!"│       │ "¤ HΩ? ∿ 👽..."  │
     │                 │       │                  │
     │   ORIGINAL      │       │    CORRUPTED     │
     └─────────────────┘       └──────────────────┘

<img width="845" height="710" alt="cantnt1" src="https://github.com/user-attachments/assets/8650d27b-867e-43f9-8fbc-0b851931894d" />
<img width="1600" height="759" alt="cantnt2" src="https://github.com/user-attachments/assets/0e0a11d2-4932-47b3-8b5e-e327cfd0c1ce" />
