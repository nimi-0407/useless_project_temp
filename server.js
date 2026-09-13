const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const users = new Map();          // socket.id -> user
const usersById = new Map();      // Chatn't ID -> user
const conversations = new Map();  // pair -> messages
const waitingLetters = new Map();// recipient ID -> letters

const EMOJIS = ["👽","🗿","🐸","🍌","🥔","🦆","💀","🤨","😂","🚀","🛸","🌚","✨","☄️","👾","🫠","🪐"];
const SYMBOLS = ["§","¤","※","∿","≈","∆","Ω","⌁","⊙","‡","¿","¡","~","^","*","⊛","⟡","⌀"];

function clean(value, max) {
    return String(value ?? "").trim().slice(0, max);
}

function makeId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function uniqueId() {
    let id = makeId();
    while (usersById.has(id)) id = makeId();
    return id;
}

function pairKey(a, b) {
    return [a, b].sort().join(":");
}

function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function jumble(text, chaos) {
    const c = Math.max(0, Math.min(100, Number(chaos) || 70));
    const EMOJIS = ["👽","🗿","🐸","🍌","🥔","🦆","💀","🤨","😂","🚀","🛸","🌚","✨","☄️","👾","🫠","🪐"];
    const SYMBOLS = ["§","¤","※","∿","≈","∆","Ω","⌁","⊙","‡","¿","¡","~","^","*","⊛","⟡","⌀","†","ƒ","¥","₩","Ƶ"];

    // At normal Chaos 70 the receiver should NOT be able to read the sentence.
    // We therefore scramble the entire character stream, not merely a few words.
    const source = Array.from(String(text));
    const letters = source.filter(ch => /[\p{L}\p{N}]/u.test(ch));
    const punctuation = source.filter(ch => !/[\p{L}\p{N}\s]/u.test(ch));

    // Shuffle every meaningful character several times.
    let pool = [...letters];
    const passes = Math.max(4, Math.ceil(c / 12));
    for (let p = 0; p < passes; p++) {
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
    }

    // Rebuild into deliberately uneven chunks so original words cannot be recognized.
    const chunks = [];
    let i = 0;
    while (i < pool.length) {
        const size = 1 + Math.floor(Math.random() * Math.min(6, pool.length - i));
        let chunk = pool.slice(i, i + size).join("");
        i += size;

        // Break some chunks with alien symbols.
        if (Math.random() < 0.78) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const pos = Math.floor(Math.random() * (chunk.length + 1));
            chunk = chunk.slice(0, pos) + symbol + chunk.slice(pos);
        }
        if (Math.random() < 0.42) {
            chunk += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        }
        chunks.push(chunk);
    }

    // Destroy chunk order too.
    for (let p = 0; p < 3; p++) {
        for (let j = chunks.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [chunks[j], chunks[k]] = [chunks[k], chunks[j]];
        }
    }

    let result = chunks.join(Math.random() < 0.5 ? " ~ " : " ∿ ");

    // Keep punctuation, but put it in unrelated positions.
    for (const mark of punctuation) {
        if (Math.random() < 0.8 && result.length) {
            const pos = Math.floor(Math.random() * result.length);
            result = result.slice(0, pos) + mark + result.slice(pos);
        }
    }

    // Add a generous amount of nonsense tokens.
    const tokenCount = Math.max(5, Math.floor(c / 9));
    for (let n = 0; n < tokenCount; n++) {
        const token = Math.random() < 0.55
            ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
            : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const parts = result.split(" ");
        const pos = Math.floor(Math.random() * (parts.length + 1));
        parts.splice(pos, 0, token);
        result = parts.join(" ");
    }

    if (c >= 55) result += " ???";
    if (c >= 70) result += " ¿§Ω ⟡";
    if (c >= 85) result += " ∿∿∿ 👽 ⌀¤";

    return result;
}

function save(message) {
    const key = pairKey(message.senderId, message.receiverId);
    if (!conversations.has(key)) conversations.set(key, []);
    conversations.get(key).push(message);
}

function broadcastPresence() {
    io.emit("presence", [...usersById.values()].map(u => ({
        chatntId: u.chatntId,
        username: u.username
    })));
}

function deliverWaitingLetters(user) {
    const letters = waitingLetters.get(user.chatntId) || [];
    if (!letters.length) return;

    for (const letter of letters) {
        save(letter);
        io.to(user.socketId).emit("receive-message", letter);
    }

    waitingLetters.delete(user.chatntId);
}

io.on("connection", socket => {
    socket.on("register", data => {
        const name = clean(typeof data === "string" ? data : data?.name, 24);
        const requestedId = clean(typeof data === "string" ? "" : data?.chatntId, 6).toUpperCase();
        if (!name) return;

        let chatntId = /^[A-Z0-9]{6}$/.test(requestedId) ? requestedId : uniqueId();

        const previous = usersById.get(chatntId);
        if (previous) {
            io.to(previous.socketId).emit("session-replaced");
            users.delete(previous.socketId);
        }

        const user = {
            socketId: socket.id,
            username: name,
            chatntId
        };

        users.set(socket.id, user);
        usersById.set(user.chatntId, user);

        socket.emit("registered", {
            username: user.username,
            chatntId: user.chatntId
        });

        broadcastPresence();
        setTimeout(() => deliverWaitingLetters(user), 150);
    });

    socket.on("find-user", id => {
        id = clean(id, 6).toUpperCase();
        const target = usersById.get(id);

        if (!target) {
            socket.emit("user-not-found");
            return;
        }

        socket.emit("user-found", {
            username: target.username,
            chatntId: target.chatntId
        });
    });

    socket.on("load-conversation", ({ otherId }) => {
        const me = users.get(socket.id);
        if (!me) return;

        const id = clean(otherId, 6).toUpperCase();
        socket.emit("conversation-history", conversations.get(pairKey(me.chatntId, id)) || []);
    });

    socket.on("send-message", data => {
        const sender = users.get(socket.id);
        if (!sender) return;

        const receiverId = clean(data?.receiverId, 6).toUpperCase();
        const original = clean(data?.message, 10000);
        const mode = data?.mode === "letter" ? "letter" : "chat";
        const chaos = Math.max(0, Math.min(100, Number(data?.chaos) || 70));

        if (!receiverId || !original || receiverId === sender.chatntId) return;

        const receiver = usersById.get(receiverId);
        const requestedReceiverName = clean(data?.receiverName, 24);

        // Chat is live-only. E-Letters can be sent whether the person is online or offline.
        if (mode === "chat" && !receiver) {
            socket.emit("message-error", "They're offline. Send an E-Letter instead.");
            return;
        }

        const message = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            senderId: sender.chatntId,
            senderName: sender.username,
            receiverId,
            receiverName: receiver ? receiver.username : (requestedReceiverName || "Friend"),
            original,
            text: jumble(original, chaos),
            mode,
            chaos,
            time: new Date().toISOString()
        };

        if (mode === "letter") {
            // E-Letters work whether the recipient is online or offline.
            // Online: save and deliver immediately. Offline: queue for reconnect.
            if (receiver) {
                // Tell the recipient that a plane is on its way. The recipient
                // sees the plane flying over their existing space screen; the
                // actual letter arrives when the flight finishes.
                io.to(receiver.socketId).emit("letter-in-flight", {
                    id: message.id,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    receiverId: message.receiverId,
                    receiverName: message.receiverName
                });

                save(message);
                setTimeout(() => {
                    // The socket may have disconnected during the flight.
                    const currentReceiver = usersById.get(receiverId);
                    if (currentReceiver) {
                        io.to(currentReceiver.socketId).emit("receive-message", message);
                    } else {
                        if (!waitingLetters.has(receiverId)) waitingLetters.set(receiverId, []);
                        waitingLetters.get(receiverId).push(message);
                    }
                }, 4200);
            } else {
                if (!waitingLetters.has(receiverId)) waitingLetters.set(receiverId, []);
                waitingLetters.get(receiverId).push(message);
            }

            // Sender always sees their own readable copy immediately.
            const senderLetter = { ...message, text: original };
            socket.emit("message-sent", senderLetter);
            socket.emit("letter-sent", senderLetter);
            return;
        }

        save(message);

        // Sender sees what they typed. Receiver sees only the corrupted version.
        socket.emit("message-sent", { ...message, text: original });
        io.to(receiver.socketId).emit("receive-message", message);
    });

    socket.on("end-chat", otherId => {
        const me = users.get(socket.id);
        if (!me) return;

        const id = clean(otherId, 6).toUpperCase();
        const other = usersById.get(id);

        if (other) {
            io.to(other.socketId).emit("chat-ended", {
                chatntId: me.chatntId,
                username: me.username
            });
        }

        socket.emit("chat-ended", { chatntId: id });
    });

    socket.on("disconnect", () => {
        const user = users.get(socket.id);
        if (!user) return;

        users.delete(socket.id);
        usersById.delete(user.chatntId);
        broadcastPresence();
    });
});
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Chatn't server running on port ${PORT}`);
    console.log(`Open on this computer: http://localhost:${PORT}`);
    console.log(`For other devices: http://<YOUR-PC-IP>:${PORT}`);
});