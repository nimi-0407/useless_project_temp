const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve files from the public folder
app.use(express.static("public"));

const PORT = 3000;

// Store online users
const users = new Map();


// ===============================
// Generate Chatn't ID
// ===============================

function generateChatntId() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    let id = "";

    for (let i = 0; i < 6; i++) {
        id += characters[
            Math.floor(Math.random() * characters.length)
        ];
    }

    return id;
}


// ===============================
// Jumble Message
// ===============================

function jumbleMessage(message) {

    let words = message.split(/\s+/);

    // Sometimes scramble letters inside words
    words = words.map(word => {

        if (word.length > 3 && Math.random() < 0.35) {

            let characters = word.split("");

            for (let i = characters.length - 1; i > 0; i--) {

                const j = Math.floor(Math.random() * (i + 1));

                [characters[i], characters[j]] =
                [characters[j], characters[i]];
            }

            return characters.join("");
        }

        return word;
    });


    // Scramble word order
    for (let i = words.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [words[i], words[j]] =
        [words[j], words[i]];
    }


    // Random useless emojis
    const emojis = [
        "🐸",
        "🍌",
        "🥔",
        "🦆",
        "🗿",
        "😂",
        "🚗",
        "🐟",
        "💀",
        "🤨"
    ];


    let result = words.join(" ");


    if (Math.random() < 0.35) {

        const randomEmoji =
            emojis[Math.floor(Math.random() * emojis.length)];

        result += " " + randomEmoji;
    }


    // Sometimes make it even more confusing
    if (Math.random() < 0.15) {

        result += " ???";
    }


    return result;
}



// ===============================
// USER CONNECTS
// ===============================

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);


    // ===========================
    // REGISTER USER
    // ===========================

    socket.on("register", (username) => {

        let chatntId = generateChatntId();


        // Make sure ID is unique
        while (
            [...users.values()]
            .some(user => user.chatntId === chatntId)
        ) {

            chatntId = generateChatntId();
        }


        const user = {

            socketId: socket.id,

            username: username,

            chatntId: chatntId
        };


        users.set(socket.id, user);


        console.log(
            `${username} joined with ID ${chatntId}`
        );


        // Tell the user their ID
        socket.emit("registered", {

            username: username,

            chatntId: chatntId
        });
    });



    // ===========================
    // FIND USER
    // ===========================

    socket.on("find-user", (chatntId) => {

        const foundUser =
            [...users.values()]
            .find(user => user.chatntId === chatntId);


        if (!foundUser) {

            socket.emit("user-not-found");

            return;
        }


        socket.emit("user-found", {

            username: foundUser.username,

            chatntId: foundUser.chatntId
        });
    });



    // ===========================
    // SEND MESSAGE
    // ===========================

    socket.on(
        "send-message",
        ({ receiverId, message }) => {

            const sender = users.get(socket.id);


            if (!sender) {

                return;
            }


            // Find receiver
            const receiver =
                [...users.values()]
                .find(
                    user =>
                        user.chatntId === receiverId
                );


            if (!receiver) {

                socket.emit(
                    "message-error",
                    "That person is not online."
                );

                return;
            }


            // Jumble the message
            const scrambledMessage =
                jumbleMessage(message);


            const messageData = {

                senderId: sender.chatntId,

                senderName: sender.username,

                receiverId: receiver.chatntId,

                original: message,

                text: scrambledMessage,

                time: new Date().toISOString()
            };


            // Send scrambled message
            // to the receiver

            io.to(receiver.socketId).emit(
                "receive-message",
                messageData
            );


            // Send copy back to sender

            io.to(socket.id).emit(
                "message-sent",
                messageData
            );


            console.log(
                `${sender.username}: ${message}`
            );

            console.log(
                `Delivered as: ${scrambledMessage}`
            );
        }
    );



    // ===========================
    // USER DISCONNECTS
    // ===========================

    socket.on("disconnect", () => {

        const user = users.get(socket.id);


        if (user) {

            console.log(
                `${user.username} disconnected`
            );

            users.delete(socket.id);
        }
    });

});


// ===============================
// START SERVER
// ===============================

server.listen(PORT, () => {

    console.log(
        `Chatn't server running at http://localhost:${PORT}`
    );

});