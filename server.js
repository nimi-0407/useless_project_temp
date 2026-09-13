const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

/*
    USERS
    socket.id -> user information
*/
const users = new Map();

/*
    CHATNT ID -> user information
*/
const usersById = new Map();

/*
    Conversation history
    pairKey -> messages
*/
const conversations = new Map();


// --------------------------------------------------
// CHAOS DATA
// --------------------------------------------------

const EMOJIS = [
    "👽", "🗿", "🐸", "🍌", "🥔",
    "🦆", "💀", "🤨", "😂", "🚀",
    "🛸", "🌚", "✨", "☄️",
    "👾", "🫠", "🪐"
];

const SYMBOLS = [
    "§", "¤", "※", "∿", "≈",
    "∆", "Ω", "⌁", "⊙", "‡",
    "¿", "¡", "~", "^", "*",
    "⊛", "⟡", "⌀", "†", "ƒ",
    "¥", "₩", "Ƶ"
];


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function clean(value, max) {
    return String(value ?? "")
        .trim()
        .slice(0, max);
}


function makeId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let id = "";

    for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return id;
}


function uniqueId() {
    let id = makeId();

    while (usersById.has(id)) {
        id = makeId();
    }

    return id;
}


function pairKey(a, b) {
    return [a, b].sort().join(":");
}


// --------------------------------------------------
// MESSAGE JUMBLER
// --------------------------------------------------

function jumble(text, chaos) {

    const c = Math.max(
        0,
        Math.min(100, Number(chaos) || 55)
    );

    const source = Array.from(String(text));

    /*
        Separate letters/numbers from punctuation.
    */
    const letters = source.filter(ch =>
        /[\p{L}\p{N}]/u.test(ch)
    );

    const punctuation = source.filter(ch =>
        !/[\p{L}\p{N}\s]/u.test(ch)
    );


    /*
        Shuffle the actual characters.
        More chaos = more shuffling.
    */
    let pool = [...letters];

    const passes = Math.max(
        4,
        Math.ceil(c / 12)
    );

    for (let p = 0; p < passes; p++) {

        for (let i = pool.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

            [pool[i], pool[j]] =
                [pool[j], pool[i]];
        }
    }


    /*
        Break the characters into random chunks.
    */
    const chunks = [];

    let index = 0;

    while (index < pool.length) {

        const size =
            1 +
            Math.floor(
                Math.random() *
                Math.min(6, pool.length - index)
            );

        let chunk =
            pool
                .slice(index, index + size)
                .join("");

        index += size;


        /*
            Add alien symbols.
        */
        if (Math.random() < 0.78) {

            const symbol =
                SYMBOLS[
                    Math.floor(
                        Math.random() * SYMBOLS.length
                    )
                ];

            const position =
                Math.floor(
                    Math.random() * (chunk.length + 1)
                );

            chunk =
                chunk.slice(0, position) +
                symbol +
                chunk.slice(position);
        }


        if (Math.random() < 0.42) {

            chunk +=
                SYMBOLS[
                    Math.floor(
                        Math.random() * SYMBOLS.length
                    )
                ];
        }


        chunks.push(chunk);
    }


    /*
        Shuffle the chunks.
    */
    for (let p = 0; p < 3; p++) {

        for (
            let j = chunks.length - 1;
            j > 0;
            j--
        ) {

            const k =
                Math.floor(
                    Math.random() * (j + 1)
                );

            [chunks[j], chunks[k]] =
                [chunks[k], chunks[j]];
        }
    }


    /*
        Join everything.
    */
    let result =
        chunks.join(
            Math.random() < 0.5
                ? " ~ "
                : " ∿ "
        );


    /*
        Move punctuation to random places.
    */
    for (const mark of punctuation) {

        if (
            Math.random() < 0.8 &&
            result.length
        ) {

            const position =
                Math.floor(
                    Math.random() * result.length
                );

            result =
                result.slice(0, position) +
                mark +
                result.slice(position);
        }
    }


    /*
        Add nonsense.
    */
    const tokenCount =
        Math.max(
            5,
            Math.floor(c / 9)
        );

    for (
        let n = 0;
        n < tokenCount;
        n++
    ) {

        const token =
            Math.random() < 0.55
                ? EMOJIS[
                    Math.floor(
                        Math.random() * EMOJIS.length
                    )
                ]
                : SYMBOLS[
                    Math.floor(
                        Math.random() * SYMBOLS.length
                    )
                ];

        const parts =
            result.split(" ");

        const position =
            Math.floor(
                Math.random() * (parts.length + 1)
            );

        parts.splice(
            position,
            0,
            token
        );

        result =
            parts.join(" ");
    }


    if (c >= 55) {
        result += " ???";
    }

    if (c >= 70) {
        result += " ¿§Ω ⟡";
    }

    if (c >= 85) {
        result += " ∿∿∿ 👽 ⌀¤";
    }


    return result;
}


// --------------------------------------------------
// SAVE MESSAGE
// --------------------------------------------------

function saveMessage(message) {

    const key =
        pairKey(
            message.senderId,
            message.receiverId
        );

    if (!conversations.has(key)) {
        conversations.set(key, []);
    }

    conversations
        .get(key)
        .push(message);
}


// --------------------------------------------------
// PRESENCE
// --------------------------------------------------

function broadcastPresence() {

    const list =
        [...usersById.values()]
            .map(user => ({
                chatntId: user.chatntId,
                username: user.username
            }));

    io.emit("presence", list);
}


// --------------------------------------------------
// REGISTER
// --------------------------------------------------

io.on("connection", socket => {

    console.log(
        "Browser connected:",
        socket.id
    );


    socket.on("register", data => {

        const username =
            clean(data?.name, 24);

        if (!username) {
            socket.emit(
                "register-error",
                "Please enter a name."
            );

            return;
        }


        /*
            Try to reuse this browser window's ID.
        */
        let requestedId =
            clean(data?.chatntId, 6)
                .toUpperCase();

        let chatntId;


        /*
            If the ID is valid and isn't already
            being used by another window, reuse it.
        */
        if (
            /^[A-Z0-9]{6}$/.test(requestedId) &&
            !usersById.has(requestedId)
        ) {

            chatntId = requestedId;

        } else {

            chatntId = uniqueId();
        }


        const user = {
            socketId: socket.id,
            username,
            chatntId
        };


        users.set(
            socket.id,
            user
        );

        usersById.set(
            chatntId,
            user
        );


        socket.emit(
            "registered",
            {
                username,
                chatntId
            }
        );


        broadcastPresence();


        console.log(
            `${username} joined as ${chatntId}`
        );
    });


    // --------------------------------------------------
    // FIND USER
    // --------------------------------------------------

    socket.on("find-user", requestedId => {

        const id =
            clean(requestedId, 6)
                .toUpperCase();

        const target =
            usersById.get(id);


        if (!target) {

            socket.emit(
                "user-not-found"
            );

            return;
        }


        socket.emit(
            "user-found",
            {
                username: target.username,
                chatntId: target.chatntId
            }
        );
    });


    // --------------------------------------------------
    // LOAD CONVERSATION
    // --------------------------------------------------

    socket.on(
        "load-conversation",
        ({ otherId }) => {

            const me =
                users.get(socket.id);

            if (!me) return;


            const id =
                clean(otherId, 6)
                    .toUpperCase();


            const history =
                conversations.get(
                    pairKey(
                        me.chatntId,
                        id
                    )
                ) || [];


            socket.emit(
                "conversation-history",
                history
            );
        }
    );


    // --------------------------------------------------
    // SEND MESSAGE
    // --------------------------------------------------

    socket.on(
        "send-message",
        data => {

            const sender =
                users.get(socket.id);

            if (!sender) return;


            const receiverId =
                clean(
                    data?.receiverId,
                    6
                ).toUpperCase();


            const original =
                clean(
                    data?.message,
                    10000
                );


            const chaos =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(data?.chaos) || 55
                    )
                );


            if (!receiverId || !original) {
                return;
            }


            /*
                Don't allow messaging yourself.
            */
            if (
                receiverId ===
                sender.chatntId
            ) {

                socket.emit(
                    "message-error",
                    "You cannot message yourself."
                );

                return;
            }


            /*
                Find recipient.
            */
            const receiver =
                usersById.get(
                    receiverId
                );


            /*
                Chat only works when the recipient
                is online.
            */
            if (!receiver) {

                socket.emit(
                    "message-error",
                    "They're offline."
                );

                return;
            }


            /*
                Create the message.
            */
            const message = {

                id:
                    `${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2)}`,

                senderId:
                    sender.chatntId,

                senderName:
                    sender.username,

                receiverId:
                    receiver.chatntId,

                receiverName:
                    receiver.username,

                original,

                text:
                    jumble(
                        original,
                        chaos
                    ),

                chaos,

                time:
                    new Date().toISOString()
            };


            /*
                Save one copy on the server.
            */
            saveMessage(message);


            /*
                SENDER
                gets exactly what they typed.
            */
            socket.emit(
                "message-sent",
                {
                    ...message,
                    text: original
                }
            );


            /*
                RECEIVER
                gets the corrupted version.
            */
            io.to(
                receiver.socketId
            ).emit(
                "receive-message",
                message
            );


            console.log(
                `${sender.username} -> ${receiver.username}: ${original}`
            );
        }
    );


    // --------------------------------------------------
    // END CHAT
    // --------------------------------------------------

    socket.on(
        "end-chat",
        otherId => {

            const me =
                users.get(socket.id);

            if (!me) return;


            const id =
                clean(
                    otherId,
                    6
                ).toUpperCase();


            const other =
                usersById.get(id);


            /*
                Tell the other person.
            */
            if (other) {

                io.to(
                    other.socketId
                ).emit(
                    "chat-ended",
                    {
                        chatntId:
                            me.chatntId,

                        username:
                            me.username
                    }
                );
            }


            /*
                Tell the person who clicked
                End Chat.
            */
            socket.emit(
                "chat-ended",
                {
                    chatntId: id
                }
            );
        }
    );


    // --------------------------------------------------
    // DISCONNECT
    // --------------------------------------------------

    socket.on(
        "disconnect",
        () => {

            const user =
                users.get(socket.id);

            if (!user) return;


            users.delete(
                socket.id
            );


            /*
                Only delete this ID if it still
                belongs to this socket.
            */
            const current =
                usersById.get(
                    user.chatntId
                );

            if (
                current &&
                current.socketId === socket.id
            ) {

                usersById.delete(
                    user.chatntId
                );
            }


            broadcastPresence();


            console.log(
                `${user.username} disconnected`
            );
        }
    );
});


// --------------------------------------------------
// START SERVER
// --------------------------------------------------

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Chatn't server running on port ${PORT}`);
    console.log(`Open on this computer: http://localhost:${PORT}`);
    console.log(`For other devices: http://<YOUR-PC-IP>:${PORT}`);
});