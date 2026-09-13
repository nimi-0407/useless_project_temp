const socket = io();

let me = {};
let currentFriend = null;
let chaos = 55;
let online = {};

const IDENTITY_KEY = "chatnt-window-identity-v13";
const FRIENDS_KEY = "chatnt-friends-v13";

const friends = JSON.parse(
    localStorage.getItem(FRIENDS_KEY) || "{}"
);


// ==================================================
// ELEMENTS
// ==================================================

const $ = id => document.getElementById(id);

const setupScreen = $("setupScreen");
const chatScreen = $("chatScreen");

const usernameInput = $("usernameInput");
const startBtn = $("startBtn");
const setupError = $("setupError");

const myName = $("myName");
const myId = $("myId");
const myAvatar = $("myAvatar");
const copyIdBtn = $("copyIdBtn");

const addFriendBtn = $("addFriendBtn");
const addFriendLarge = $("addFriendLarge");

const friendModal = $("friendModal");
const closeModal = $("closeModal");
const friendIdInput = $("friendIdInput");
const findFriendBtn = $("findFriendBtn");
const friendError = $("friendError");

const friendList = $("friendList");
const chatCount = $("chatCount");

const welcome = $("welcome");
const chatView = $("chatView");

const chatAvatar = $("chatAvatar");
const chatTitle = $("chatTitle");
const chatStatus = $("chatStatus");

const chatMessages = $("chatMessages");

const endChatBtn = $("endChatBtn");

const messageInput = $("messageInput");
const sendBtn = $("sendBtn");

const chaosSlider = $("chaosSlider");
const chaosValue = $("chaosValue");
const chaosLabel = $("chaosLabel");

const toast = $("toast");


// ==================================================
// NAME / IDENTITY
// ==================================================

if (startBtn) {
    startBtn.onclick = register;
}

if (usernameInput) {
    usernameInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            register();
        }

    });
}


function register() {

    const name =
        usernameInput.value.trim();


    if (!name) {

        setupError.textContent =
            "Enter a name for this browser window.";

        return;
    }


    /*
        sessionStorage is intentional.

        Every browser window gets its own identity.
        This allows two users to test Chatn't on
        the same computer.
    */

    const saved =
        JSON.parse(
            sessionStorage.getItem(
                IDENTITY_KEY
            ) || "null"
        );


    socket.emit(
        "register",
        {
            name: name,
            chatntId:
                saved?.chatntId || ""
        }
    );
}


socket.on("registered", data => {

    me = data;


    sessionStorage.setItem(
        IDENTITY_KEY,
        JSON.stringify(data)
    );


    myName.textContent =
        me.username;

    myId.textContent =
        me.chatntId;

    myAvatar.textContent =
        initial(me.username);


    setupScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");


    renderFriends();


    showToast(
        `Welcome, ${me.username} ✦`
    );
});


// ==================================================
// PRESENCE
// ==================================================

socket.on("presence", list => {

    online = {};


    list.forEach(user => {

        online[user.chatntId] = true;

        /*
            If someone we already know changes
            their name, update it.
        */
        if (friends[user.chatntId]) {

            friends[user.chatntId].username =
                user.username;
        }

    });


    saveFriends();
    renderFriends();


    if (currentFriend) {
        updateChatStatus();
    }
});


function isOnline(id) {
    return !!online[id];
}


function updateChatStatus() {

    if (!currentFriend) return;


    const isOn =
        isOnline(
            currentFriend.chatntId
        );


    chatStatus.className =
        isOn ? "online" : "offline";


    chatStatus.innerHTML =
        `<i></i> ${isOn ? "Online" : "Offline"}`;


    /*
        Disable send button if the person
        is offline.
    */
    updateSendButton();
}


function updateSendButton() {

    if (!sendBtn) return;


    if (!currentFriend) {

        sendBtn.disabled = true;

        return;
    }


    const on =
        isOnline(
            currentFriend.chatntId
        );


    sendBtn.disabled = !on;
}


// ==================================================
// FRIENDS
// ==================================================

function saveFriends() {

    localStorage.setItem(
        FRIENDS_KEY,
        JSON.stringify(friends)
    );
}


function renderFriends() {

    const ids =
        Object.keys(friends);


    chatCount.textContent =
        ids.length;


    if (!ids.length) {

        friendList.innerHTML = `
            <div class="empty-folder">
                No conversations yet.
            </div>
        `;

        return;
    }


    friendList.innerHTML = "";


    ids.forEach(id => {

        const friend =
            friends[id];


        const on =
            isOnline(id);


        const item =
            document.createElement("button");


        item.className =
            "friend-item" +
            (
                currentFriend?.chatntId === id
                    ? " selected"
                    : ""
            );


        item.dataset.friendId =
            id;


        item.innerHTML = `

            <div class="friend-avatar">
                ${escapeHTML(
                    initial(friend.username)
                )}
            </div>

            <div class="friend-copy">

                <strong>
                    ${escapeHTML(
                        friend.username
                    )}
                </strong>

                <small class="friend-id">
                    ID: ${escapeHTML(
                        friend.chatntId
                    )}
                </small>

                <small class="${
                    on
                        ? "online"
                        : "offline"
                }">

                    <i></i>

                    ${
                        on
                            ? "Online"
                            : "Offline"
                    }

                </small>

            </div>
        `;


        item.onclick =
            () => selectFriend(id);


        friendList.appendChild(item);
    });
}


// ==================================================
// SELECT FRIEND
// ==================================================

function selectFriend(id) {

    if (!friends[id]) return;


    currentFriend =
        friends[id];


    welcome.classList.add("hidden");
    chatView.classList.remove("hidden");


    chatTitle.textContent =
        currentFriend.username;


    chatAvatar.textContent =
        initial(
            currentFriend.username
        );


    updateChatStatus();


    renderFriends();


    chatMessages.innerHTML = `

        <div class="loading">
            Opening the wrong dimension…
        </div>
    `;


    /*
        Ask server for the complete
        conversation history.
    */

    socket.emit(
        "load-conversation",
        {
            otherId:
                currentFriend.chatntId
        }
    );


    messageInput.focus();
}


// ==================================================
// ADD FRIEND
// ==================================================

function openFriendModal() {

    friendModal.classList.remove(
        "hidden"
    );


    friendIdInput.value = "";
    friendError.textContent = "";


    setTimeout(
        () => friendIdInput.focus(),
        100
    );
}


addFriendBtn.onclick =
    openFriendModal;


addFriendLarge.onclick =
    openFriendModal;


closeModal.onclick =
    () => {
        friendModal.classList.add(
            "hidden"
        );
    };


friendModal.addEventListener(
    "click",
    event => {

        if (
            event.target === friendModal
        ) {

            friendModal.classList.add(
                "hidden"
            );
        }

    }
);


findFriendBtn.onclick =
    findFriend;


friendIdInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            findFriend();
        }

    }
);


function findFriend() {

    const id =
        friendIdInput.value
            .trim()
            .toUpperCase();


    if (!/^[A-Z0-9]{6}$/.test(id)) {

        friendError.textContent =
            "Enter a valid 6-character ID.";

        return;
    }


    if (id === me.chatntId) {

        friendError.textContent =
            "You cannot add yourself.";

        return;
    }


    socket.emit(
        "find-user",
        id
    );
}


socket.on("user-found", user => {

    friends[user.chatntId] = {

        chatntId:
            user.chatntId,

        username:
            user.username
    };


    saveFriends();


    friendModal.classList.add(
        "hidden"
    );


    renderFriends();


    selectFriend(
        user.chatntId
    );


    showToast(
        `${user.username} added ✦`
    );
});


socket.on("user-not-found", () => {

    friendError.textContent =
        "That person is not online right now.";
});


// ==================================================
// SEND CHAT MESSAGE
// ==================================================

sendBtn.onclick =
    sendChat;


messageInput.addEventListener(
    "keydown",
    event => {

        /*
            Enter = send

            Shift + Enter =
            new line
        */

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendChat();
        }

    }
);


messageInput.addEventListener(
    "input",
    () => {

        messageInput.style.height =
            "auto";


        messageInput.style.height =
            Math.min(
                messageInput.scrollHeight,
                140
            ) + "px";

    }
);


function sendChat() {

    if (!currentFriend) {

        showToast(
            "Choose someone to chat with."
        );

        return;
    }


    /*
        Chat only works when the
        receiver is online.
    */

    if (
        !isOnline(
            currentFriend.chatntId
        )
    ) {

        showToast(
            "They're offline."
        );

        return;
    }


    const text =
        messageInput.value.trim();


    if (!text) return;


    /*
        IMPORTANT:

        We do NOT jumble the message here.

        The server creates the corrupted
        version for the receiver.

        Sender receives the original.
        Receiver receives the jumble.
    */

    socket.emit(
        "send-message",
        {
            receiverId:
                currentFriend.chatntId,

            message:
                text,

            chaos:
                chaos
        }
    );


    /*
        Clear the input immediately.
    */

    messageInput.value = "";

    messageInput.style.height =
        "auto";
}


// ==================================================
// SENDER RECEIVES THEIR OWN MESSAGE
// ==================================================

socket.on(
    "message-sent",
    message => {

        /*
            Only show the message if the
            current conversation is the
            intended conversation.
        */

        if (
            !currentFriend
        ) return;


        if (
            message.receiverId !==
            currentFriend.chatntId
        ) return;


        /*
            message.original is what the
            sender actually typed.
        */

        displayMessage(
            message,
            true
        );


        scrollMessages();
    }
);


// ==================================================
// RECEIVER GETS CORRUPTED MESSAGE
// ==================================================

socket.on(
    "receive-message",
    message => {

        /*
            Automatically add the sender
            to the conversation list if
            they aren't already there.
        */

        if (
            !friends[message.senderId]
        ) {

            friends[message.senderId] = {

                chatntId:
                    message.senderId,

                username:
                    message.senderName
            };


            saveFriends();
        }


        /*
            Update their name if necessary.
        */

        friends[
            message.senderId
        ].username =
            message.senderName;


        saveFriends();
        renderFriends();


        /*
            If we are currently talking
            to this person, show the message.
        */

        if (
            currentFriend &&
            currentFriend.chatntId ===
            message.senderId
        ) {

            displayMessage(
                message,
                false
            );


            scrollMessages();

        } else {

            /*
                Message arrived while another
                conversation is open.
            */

            showToast(
                `New message from ${message.senderName} ✦`
            );
        }
    }
);


// ==================================================
// CONVERSATION HISTORY
// ==================================================

socket.on(
    "conversation-history",
    history => {

        chatMessages.innerHTML = "";


        if (!history.length) {

            chatMessages.innerHTML = `

                <div class="conversation-empty">

                    <div>✦</div>

                    <h3>
                        The correspondence begins here.
                    </h3>

                    <p>
                        Say something perfectly understandable.
                    </p>

                </div>
            `;

            return;
        }


        history.forEach(message => {

            const mine =
                message.senderId ===
                me.chatntId;


            displayMessage(
                message,
                mine
            );
        });


        scrollMessages();
    }
);


// ==================================================
// DISPLAY MESSAGE
// ==================================================

function displayMessage(
    message,
    mine
) {

    /*
        Prevent accidental duplicate messages.

        Every message gets a unique ID.
    */

    if (
        document.querySelector(
            `[data-message-id="${CSS.escape(
                String(message.id)
            )}"]`
        )
    ) {

        return;
    }


    const row =
        document.createElement("article");


    row.className =
        `message ${
            mine
                ? "mine"
                : "theirs"
        } arrive`;


    row.dataset.messageId =
        message.id;


    /*
        VERY IMPORTANT:

        Sender:
            message.original

        Receiver:
            message.text

        Therefore the receiver never
        gets the original message.
    */

    const visibleText =
        mine
            ? (
                message.original ??
                message.text
            )
            : message.text;


    row.innerHTML = `

        <div class="chat-bubble">
            ${escapeHTML(visibleText)}
        </div>

    `;


    chatMessages.appendChild(
        row
    );
}


// ==================================================
// END CHAT
// ==================================================

endChatBtn.onclick = () => {

    if (!currentFriend) return;


    const friend =
        currentFriend;


    const confirmed =
        confirm(
            `End the correspondence with ${friend.username}?`
        );


    if (!confirmed) return;


    socket.emit(
        "end-chat",
        friend.chatntId
    );


    delete friends[
        friend.chatntId
    ];


    saveFriends();


    currentFriend = null;


    chatView.classList.add(
        "hidden"
    );


    welcome.classList.remove(
        "hidden"
    );


    renderFriends();


    showToast(
        "Correspondence ended."
    );
};


socket.on(
    "chat-ended",
    data => {

        /*
            Only react if this is the
            person we are currently chatting with.
        */

        if (
            !currentFriend ||
            currentFriend.chatntId !==
            data.chatntId
        ) {

            return;
        }


        delete friends[
            data.chatntId
        ];


        saveFriends();


        currentFriend = null;


        chatView.classList.add(
            "hidden"
        );


        welcome.classList.remove(
            "hidden"
        );


        renderFriends();


        showToast(
            "The correspondence has ended."
        );
    }
);


// ==================================================
// CHAOS SLIDER
// ==================================================

chaosSlider.oninput = () => {

    chaos =
        Number(
            chaosSlider.value
        );


    chaosValue.textContent =
        `${chaos}%`;


    chaosLabel.textContent =
        `${chaos}%`;
};


// Set initial value correctly
chaos =
    Number(
        chaosSlider.value
    );


chaosValue.textContent =
    `${chaos}%`;


chaosLabel.textContent =
    `${chaos}%`;


// ==================================================
// COPY ID
// ==================================================

copyIdBtn.onclick = async () => {

    try {

        await navigator.clipboard.writeText(
            me.chatntId
        );


        copyIdBtn.textContent =
            "Copied!";


        setTimeout(
            () => {
                copyIdBtn.textContent =
                    "Copy";
            },
            1100
        );

    } catch {

        showToast(
            `Your Chatn't ID is ${me.chatntId}`
        );
    }
};


// ==================================================
// SCROLL
// ==================================================

function scrollMessages() {

    requestAnimationFrame(
        () => {

            chatMessages.scrollTop =
                chatMessages.scrollHeight;

        }
    );
}


// ==================================================
// HELPERS
// ==================================================

function initial(name) {

    return (
        name || "?"
    )
        .charAt(0)
        .toUpperCase();
}


function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value ?? "");


    return div.innerHTML;
}


function showToast(text) {

    toast.textContent =
        text;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        showToast.timer
    );


    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );
}


// ==================================================
// CONNECTION STATUS
// ==================================================

socket.on("connect", () => {

    console.log(
        "Connected to Chatn't server."
    );

});


socket.on("disconnect", () => {

    console.log(
        "Disconnected from Chatn't server."
    );

});


socket.on(
    "message-error",
    text => {

        showToast(text);

    }
);


// ==================================================
// SESSION REPLACED
// ==================================================

socket.on(
    "session-replaced",
    () => {

        showToast(
            "This Chatn't ID is open in another window."
        );

    }
);