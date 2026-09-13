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

function corruptWord(word, chaos) {
    const chars = Array.from(word);
    if (chars.length < 2) return word;

    // Multiple Fisher-Yates passes: deliberately destroy spelling.
    const passes = Math.max(2, Math.ceil(chaos / 22));
    for (let p = 0; p < passes; p++) {
        for (let i = chars.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }
    }

    return chars.join("");
}

function jumble(text, chaos) {
    const c = Math.max(0, Math.min(100, Number(chaos) || 70));
    const words = text.split(/\s+/).filter(Boolean);

    let damaged = words.map(word => {
        let w = corruptWord(word, Math.max(c, 70));

        // Replace some punctuation with nonsense punctuation/symbols.
        if (Math.random() < 0.65) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const pos = Math.floor(Math.random() * (w.length + 1));
            w = w.slice(0, pos) + symbol + w.slice(pos);
        }

        if (Math.random() < 0.38) {
            w += SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        }

        return w;
    });

    // Destroy sentence/word order heavily.
    damaged = shuffle(damaged);
    if (c >= 50) damaged = shuffle(damaged);
    if (c >= 70) damaged = shuffle(damaged);

    let result = damaged.join(" ");

    // Add nonsense tokens.
    const amount = Math.max(3, Math.floor(c / 12));
    for (let i = 0; i < amount; i++) {
        const token = Math.random() < 0.58
            ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
            : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        result += " " + token;
    }

    if (c >= 45) result += " ???";
    if (c >= 65) result += " ¿§Ω";
    if (c >= 80) result += " ∿∿∿ " + EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    if (c >= 92) result += " ⟡⌀¤";

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
    socket.on("register", name => {
        name = clean(name, 24);
        if (!name) return;

        // Every browser window gets its own name and Chatn't ID.
        const user = {
            socketId: socket.id,
            username: name,
            chatntId: uniqueId()
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

        // Chat requires the other browser window to be open.
        if (mode === "chat" && !receiver) {
            socket.emit("message-error", "They're offline. Use the letter folder instead.");
            return;
        }

        // Letter requires the other browser window to be closed.
        if (mode === "letter" && receiver) {
            socket.emit("message-error", "Their window is still open. Close it before sending a letter.");
            return;
        }

        const message = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            senderId: sender.chatntId,
            senderName: sender.username,
            receiverId,
            receiverName: receiver ? receiver.username : "Offline Traveler",
            text: jumble(original, chaos),
            mode,
            chaos,
            time: new Date().toISOString()
        };

        if (mode === "letter") {
            if (!waitingLetters.has(receiverId)) waitingLetters.set(receiverId, []);
            waitingLetters.get(receiverId).push(message);

            // Sender sees a compact "letter sent" event, not the full letter.
            socket.emit("message-sent", message);
            socket.emit("letter-sent", message);
            return;
        }

        save(message);

        // Both screens receive the exact same corrupted message.
        socket.emit("message-sent", message);
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

httpServer.listen(PORT, () => {
    console.log(`Chatn't server ready at http://localhost:${PORT}`);
});