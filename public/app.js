const socket = io();

let myUsername = "";
let myChatntId = "";
let currentFriend = null;

const friends = {};


// ===============================
// ELEMENTS
// ===============================

const setupScreen = document.getElementById("setupScreen");
const chatScreen = document.getElementById("chatScreen");

const usernameInput = document.getElementById("usernameInput");
const startBtn = document.getElementById("startBtn");

const myName = document.getElementById("myName");
const myId = document.getElementById("myId");
const copyIdBtn = document.getElementById("copyIdBtn");

const addFriendBtn = document.getElementById("addFriendBtn");

const friendModal = document.getElementById("friendModal");
const closeModal = document.getElementById("closeModal");

const friendIdInput = document.getElementById("friendIdInput");
const findFriendBtn = document.getElementById("findFriendBtn");

const friendError = document.getElementById("friendError");
const friendResult = document.getElementById("friendResult");

const friendList = document.getElementById("friendList");

const welcome = document.getElementById("welcome");
const chatView = document.getElementById("chatView");

const chatTitle = document.getElementById("chatTitle");
const chatAvatar = document.getElementById("chatAvatar");
const chatStatus = document.getElementById("chatStatus");

const chatMessages = document.getElementById("chatMessages");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");


// ===============================
// START CHAT
// ===============================

startBtn.addEventListener("click", startChat);

usernameInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
        startChat();
    }

});


function startChat() {

    const username = usernameInput.value.trim();

    if (!username) {

        document.getElementById("setupError").textContent =
            "Please enter a username.";

        return;
    }

    document.getElementById("setupError").textContent = "";

    socket.emit("register", username);
}


// ===============================
// REGISTERED
// ===============================

socket.on("registered", (data) => {

    myUsername = data.username;
    myChatntId = data.chatntId;

    myName.textContent = myUsername;
    myId.textContent = myChatntId;

    setupScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    showToast(
        "Welcome to Chatn't, " + myUsername + " 🤪"
    );

});


// ===============================
// COPY ID
// ===============================

copyIdBtn.addEventListener("click", async () => {

    try {

        await navigator.clipboard.writeText(myChatntId);

        copyIdBtn.textContent = "Copied!";

        showToast("Chatn't ID copied!");

        setTimeout(() => {

            copyIdBtn.textContent = "Copy";

        }, 1500);

    } catch {

        alert(
            "Your Chatn't ID is:\n\n" +
            myChatntId
        );

    }

});


// ===============================
// OPEN ADD FRIEND MODAL
// ===============================

addFriendBtn.addEventListener("click", () => {

    friendModal.classList.remove("hidden");

    friendIdInput.value = "";

    friendError.textContent = "";

    friendResult.classList.add("hidden");

    friendIdInput.focus();

});


// ===============================
// CLOSE MODAL
// ===============================

closeModal.addEventListener("click", () => {

    friendModal.classList.add("hidden");

});


// Close modal by clicking outside
friendModal.addEventListener("click", (event) => {

    if (event.target === friendModal) {

        friendModal.classList.add("hidden");

    }

});


// ===============================
// FIND FRIEND
// ===============================

findFriendBtn.addEventListener(
    "click",
    findFriend
);


friendIdInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        findFriend();

    }

});


function findFriend() {

    const friendId =
        friendIdInput.value.trim().toUpperCase();


    if (!friendId) {

        friendError.textContent =
            "Enter a Chatn't ID.";

        return;
    }


    if (friendId === myChatntId) {

        friendError.textContent =
            "You can't add yourself 😭";

        return;
    }


    friendError.textContent = "";

    socket.emit(
        "find-user",
        friendId
    );

}


// ===============================
// FRIEND FOUND
// ===============================

socket.on("user-found", (user) => {

    friends[user.chatntId] = {

        username: user.username,

        chatntId: user.chatntId

    };


    friendModal.classList.add("hidden");

    friendIdInput.value = "";

    renderFriends();

    selectFriend(user.chatntId);

    showToast(
        user.username + " added! 🎉"
    );

});


// ===============================
// FRIEND NOT FOUND
// ===============================

socket.on("user-not-found", () => {

    friendError.textContent =
        "User not found. Make sure they have Chatn't open and check the ID.";

});


// ===============================
// RENDER FRIENDS
// ===============================

function renderFriends() {

    friendList.innerHTML = "";


    const friendIds =
        Object.keys(friends);


    if (friendIds.length === 0) {

        friendList.innerHTML = `
            <div class="empty-list">
                Add a friend to begin.
            </div>
        `;

        return;
    }


    friendIds.forEach((id) => {

        const friend = friends[id];


        const item =
            document.createElement("button");


        item.className = "friend-item";


        if (
            currentFriend &&
            currentFriend.chatntId === id
        ) {

            item.classList.add("active");

        }


        item.innerHTML = `

            <div class="friend-avatar">
                ${getInitial(friend.username)}
            </div>

            <div class="friend-info">

                <strong>
                    ${escapeHTML(friend.username)}
                </strong>

                <small>
                    ${friend.chatntId}
                </small>

            </div>

        `;


        item.addEventListener(
            "click",
            () => selectFriend(id)
        );


        friendList.appendChild(item);

    });

}


// ===============================
// SELECT FRIEND
// ===============================

function selectFriend(friendId) {

    const friend = friends[friendId];


    if (!friend) {
        return;
    }


    currentFriend = friend;


    welcome.classList.add("hidden");

    chatView.classList.remove("hidden");


    chatTitle.textContent =
        friend.username;


    chatAvatar.textContent =
        getInitial(friend.username);


    chatStatus.textContent =
        "Online";


    chatMessages.innerHTML = `

        <div class="chat-welcome">

            <div class="welcome-icon">
                🤪
            </div>

            <h2>
                You're chatting with
                ${escapeHTML(friend.username)}
            </h2>

            <p>
                Say something normal.
            </p>

            <p>
                We'll make it absolutely
                not normal.
            </p>

        </div>

    `;


    renderFriends();

    messageInput.focus();

}


// ===============================
// SEND MESSAGE
// ===============================

sendBtn.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    (event) => {

        // Enter = send
        // Shift + Enter = new line

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


function sendMessage() {

    if (!currentFriend) {

        showToast(
            "Choose someone to chat with first."
        );

        return;
    }


    const message =
        messageInput.value.trim();


    if (!message) {
        return;
    }


    socket.emit(
        "send-message",
        {

            receiverId:
                currentFriend.chatntId,

            message:
                message

        }
    );


    messageInput.value = "";

    messageInput.style.height = "auto";

    messageInput.focus();

}


// ===============================
// MESSAGE SENT
// ===============================

socket.on(
    "message-sent",
    (message) => {

        addMessage(
            message,
            true
        );

    }
);


// ===============================
// MESSAGE RECEIVED
// ===============================

socket.on(
    "receive-message",
    (message) => {

        // Automatically add sender
        // if we don't already know them

        if (
            !friends[message.senderId]
        ) {

            friends[message.senderId] = {

                username:
                    message.senderName,

                chatntId:
                    message.senderId

            };

            renderFriends();

        }


        addMessage(
            message,
            false
        );

    }
);


// ===============================
// DISPLAY MESSAGE
// ===============================

function addMessage(
    message,
    isMine
) {

    // Make sure the correct conversation
    // is currently open

    if (isMine) {

        if (
            !currentFriend ||
            message.receiverId !==
            currentFriend.chatntId
        ) {

            return;
        }

    } else {

        if (
            !currentFriend ||
            message.senderId !==
            currentFriend.chatntId
        ) {

            return;
        }

    }


    // Remove welcome message

    const welcomeMessage =
        chatMessages.querySelector(
            ".chat-welcome"
        );


    if (welcomeMessage) {

        welcomeMessage.remove();

    }


    // Create message container

    const messageElement =
        document.createElement("div");


    messageElement.className =
        isMine
            ? "message sent"
            : "message received";


    // Sender sees original + scrambled

    if (isMine) {

        messageElement.innerHTML = `

            <div class="message-bubble">

                <div class="scrambled">
                    ${escapeHTML(message.text)}
                </div>

                <div class="original">

                    What you actually meant:

                    <strong>
                        ${escapeHTML(message.original)}
                    </strong>

                </div>

            </div>

        `;

    }

    // Receiver sees only scrambled version

    else {

        messageElement.innerHTML = `

            <div class="message-bubble">

                <div class="scrambled">
                    ${escapeHTML(message.text)}
                </div>

            </div>

        `;

    }


    chatMessages.appendChild(
        messageElement
    );


    // Scroll to newest message

    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


// ===============================
// MESSAGE ERROR
// ===============================

socket.on(
    "message-error",
    (error) => {

        showToast(error);

    }
);


// ===============================
// TEXTAREA AUTO RESIZE
// ===============================

messageInput.addEventListener(
    "input",
    () => {

        messageInput.style.height =
            "auto";

        messageInput.style.height =
            Math.min(
                messageInput.scrollHeight,
                150
            ) + "px";

    }
);


// ===============================
// TOAST
// ===============================

function showToast(message) {

    const toast =
        document.getElementById("toast");


    if (!toast) {
        return;
    }


    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


// ===============================
// GET INITIAL
// ===============================

function getInitial(name) {

    if (!name) {
        return "?";
    }


    return name
        .charAt(0)
        .toUpperCase();

}


// ===============================
// SECURITY
// ===============================

function escapeHTML(text) {

    const div =
        document.createElement("div");


    div.textContent = text;


    return div.innerHTML;

}


// ===============================
// CONNECTION STATUS
// ===============================

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