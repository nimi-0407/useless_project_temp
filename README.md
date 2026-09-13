Chatn't 🎯

A messaging app where communication works perfectly... except the person receiving your message has absolutely no idea what you said.

Basic Details
Team Name: Codepoint
Team Members
Team Lead: Rose Mathew - [College Name]
Member 2: Nimisha Brijit Joshy - [College Name]
Project Description

Chatn't is a useless messaging application designed to make simple communication unnecessarily difficult. Users can send completely normal messages, but the receiver gets a hilariously scrambled and chaotic version of the message.

The app combines real-time messaging with a space-themed interface and a controllable Chaos Level to determine just how badly the message gets destroyed.

The Problem (that doesn't exist)

People can already understand messages far too easily.

In normal messaging apps, when someone sends:

"Are you coming to the hackathon?"

the receiver actually understands it.

This is clearly a serious problem.

The Solution (that nobody asked for)

Chatn't destroys perfectly understandable messages before they reach the receiver.

Characters are shuffled, words are scrambled, strange symbols and random emojis are inserted, and the message gradually becomes complete nonsense.

The sender sees:

Are you coming to the hackathon?

The receiver sees something more like:

¤ 👽 com≈ yΩu ~ hacka§thon ∿ 🗿 ???

Because apparently communication needed to be harder.

Technical Details
Technologies/Components Used
For Software
Languages used
HTML
CSS
JavaScript
Frameworks used
Node.js
Express.js
Libraries used
Socket.IO
Tools used
Visual Studio Code
Git
GitHub
Web Browser
For Hardware
Not applicable — Chatn't is completely software-based.
Implementation
For Software

Chatn't uses a Node.js + Express + Socket.IO architecture.

The browser connects to the Node.js server using Socket.IO. When a user sends a message, the server receives the original message and creates a corrupted version based on the selected Chaos Level.

The sender receives the original message, while the receiver receives only the corrupted version.

Message Flow
Sender
   │
   │ "Hello, how are you?"
   ▼
Socket.IO Server
   │
   │
   ├──────────────► Sender
   │               "Hello, how are you?"
   │
   │
   └──────────────► Receiver
                   "¤ HΩ? ~ 👽 are ∿ y§u ???"
Installation

Clone the repository:

git clone <YOUR_GITHUB_REPOSITORY_URL>

Go into the project folder:

cd useless_messaging

Install the required Node.js packages:

npm install
Run

Start the Chatn't server:

npm start

Then open:

http://localhost:3000

For testing two users on the same computer, open Chatn't in two separate browser windows.

Example:

Window 1 → Rose
Window 2 → Nimisha

Each window receives its own 6-character Chatn't ID.

Add the other person's ID and start chatting.

Project Documentation
Screenshots
Screenshot 1 — Chatn't Home Screen

The Chatn't landing screen where the user enters their name before entering the messaging application.

Screenshot 2 — Conversation Screen

The main messaging interface showing the space-themed environment, friend list, online status, chaos slider, and chat area.

Screenshot 3 — Corrupted Message

The receiver sees a deliberately corrupted version of the original message containing shuffled characters, symbols, emojis and nonsense.

Diagrams
System Architecture
                 ┌─────────────────────┐
                 │      Browser 1      │
                 │       Sender        │
                 └──────────┬──────────┘
                            │
                            │ Socket.IO
                            ▼
                 ┌─────────────────────┐
                 │    Node.js Server   │
                 │                     │
                 │  • User Management │
                 │  • Message Routing  │
                 │  • Chaos Generator  │
                 └──────────┬──────────┘
                            │
                            │ Socket.IO
                            ▼
                 ┌─────────────────────┐
                 │      Browser 2      │
                 │      Receiver       │
                 └─────────────────────┘

Chatn't uses Socket.IO to provide real-time communication between browser clients through a Node.js server.

Project Demo
Video

Add your demo video link here.

The demonstration will show two users connecting to Chatn't, adding each other, sending messages, and watching perfectly normal messages turn into complete nonsense for the receiver.

Additional Demos

Possible demonstrations:

Different Chaos Levels
Two users chatting simultaneously
Online/offline status
Adding friends using Chatn't IDs
Sending messages with low, medium and maximum chaos
Team Contributions
Rose Mathew: Project concept, frontend development, UI/UX design, real-time chat integration, testing and documentation.
Nimisha Brijit Joshy: Backend development, Socket.IO communication, message-jumbling logic, testing and presentation.
The Official Purpose of Chatn't

We solved a problem nobody had.
Then we made it worse. 🚀
