const socket = io();

let me = {};
let currentFriend = null;
let currentMode = "chat";
let chaos = 70;

const friends = JSON.parse(localStorage.getItem("chatnt-friends") || "{}");
let sentLetters = JSON.parse(localStorage.getItem("chatnt-sent-letters") || "[]");
let online = {};

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
const letterList = $("letterList");
const chatCount = $("chatCount");
const letterCount = $("letterCount");

const welcome = $("welcome");
const chatView = $("chatView");
const chatAvatar = $("chatAvatar");
const chatTitle = $("chatTitle");
const chatStatus = $("chatStatus");
const chatMessages = $("chatMessages");
const letterNotice = $("letterNotice");

const chatModeBtn = $("chatModeBtn");
const letterModeBtn = $("letterModeBtn");
const endChatBtn = $("endChatBtn");

const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const chaosSlider = $("chaosSlider");
const chaosValue = $("chaosValue");
const chaosLabel = $("chaosLabel");

const letterOverlay = $("letterOverlay");
const closeLetter = $("closeLetter");
const letterRecipient = $("letterRecipient");
const letterCompose = $("letterCompose");
const letterView = $("letterView");
const letterInput = $("letterInput");
const letterViewText = $("letterViewText");
const sendLetterBtn = $("sendLetterBtn");

const toast = $("toast");


// ---------------- NAME / ID ----------------

startBtn.onclick = register;
usernameInput.addEventListener("keydown", e => {
    if (e.key === "Enter") register();
});

function register() {
    const name = usernameInput.value.trim();

    if (!name) {
        setupError.textContent = "Enter a name for this browser window.";
        return;
    }

    socket.emit("register", name);
}

socket.on("registered", data => {
    me = data;
    myName.textContent = me.username;
    myId.textContent = me.chatntId;
    myAvatar.textContent = initial(me.username);

    setupScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    renderFriends();
    renderLetters();
    showToast(`Welcome, ${me.username} ✦`);
});


// ---------------- PRESENCE ----------------

socket.on("presence", list => {
    online = {};
    list.forEach(user => online[user.chatntId] = true);

    renderFriends();

    if (currentFriend) {
        updateStatus();
        updateModeAvailability();
    }
});

function isOnline(id) {
    return !!online[id];
}

function updateStatus() {
    const on = currentFriend && isOnline(currentFriend.chatntId);

    chatStatus.className = on ? "online" : "offline";
    chatStatus.innerHTML = `<i></i> ${on ? "Online" : "Offline"}`;
}

function updateModeAvailability() {
    if (!currentFriend) return;

    const on = isOnline(currentFriend.chatntId);

    // Chat is enabled ONLY while recipient is online.
    chatModeBtn.disabled = !on;

    // Letter is enabled ONLY while recipient is offline.
    letterModeBtn.disabled = on;

    letterNotice.classList.toggle("hidden", on);

    if (on) setMode("chat");
}


// ---------------- FRIEND FOLDER ----------------

function saveFriends() {
    localStorage.setItem("chatnt-friends", JSON.stringify(friends));
}

function renderFriends() {
    const ids = Object.keys(friends);
    chatCount.textContent = ids.length;

    if (!ids.length) {
        friendList.innerHTML = `<div class="empty-folder">No conversations yet.</div>`;
        return;
    }

    friendList.innerHTML = "";

    ids.forEach(id => {
        const friend = friends[id];
        const on = isOnline(id);

        const item = document.createElement("button");
        item.className = "friend-item" + (currentFriend?.chatntId === id ? " selected" : "");

        item.innerHTML = `
            <div class="friend-avatar">${escapeHTML(initial(friend.username))}</div>
            <div class="friend-copy">
                <strong>${escapeHTML(friend.username)}</strong>
                <small class="${on ? "online" : "offline"}"><i></i>${on ? "Online" : "Offline"}</small>
            </div>
        `;

        item.onclick = () => selectFriend(id);
        friendList.appendChild(item);
    });
}

function selectFriend(id) {
    currentFriend = friends[id];

    welcome.classList.add("hidden");
    chatView.classList.remove("hidden");

    chatTitle.textContent = currentFriend.username;
    chatAvatar.textContent = initial(currentFriend.username);

    updateStatus();
    updateModeAvailability();
    renderFriends();

    chatMessages.innerHTML = `<div class="loading">Opening the wrong dimension…</div>`;

    socket.emit("load-conversation", { otherId: currentFriend.chatntId });
    messageInput.focus();
}


// ---------------- ADD FRIEND ----------------

function openFriendModal() {
    friendModal.classList.remove("hidden");
    friendIdInput.value = "";
    friendError.textContent = "";
    setTimeout(() => friendIdInput.focus(), 80);
}

addFriendBtn.onclick = openFriendModal;
addFriendLarge.onclick = openFriendModal;
closeModal.onclick = () => friendModal.classList.add("hidden");

friendModal.addEventListener("click", e => {
    if (e.target === friendModal) friendModal.classList.add("hidden");
});

findFriendBtn.onclick = findFriend;
friendIdInput.addEventListener("keydown", e => {
    if (e.key === "Enter") findFriend();
});

function findFriend() {
    const id = friendIdInput.value.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(id)) {
        friendError.textContent = "Enter a valid 6-character ID.";
        return;
    }

    if (id === me.chatntId) {
        friendError.textContent = "You cannot add yourself.";
        return;
    }

    socket.emit("find-user", id);
}

socket.on("user-found", user => {
    friends[user.chatntId] = {
        chatntId: user.chatntId,
        username: user.username
    };

    saveFriends();
    friendModal.classList.add("hidden");
    renderFriends();
    selectFriend(user.chatntId);

    showToast(`${user.username} added ✦`);
});

socket.on("user-not-found", () => {
    friendError.textContent = "That person is not online right now.";
});


// ---------------- MODES ----------------

chatModeBtn.onclick = () => {
    if (!currentFriend) return;

    if (!isOnline(currentFriend.chatntId)) {
        showToast("They're offline. The letter route is open.");
        return;
    }

    setMode("chat");
};

letterModeBtn.onclick = () => {
    if (!currentFriend) return;

    if (isOnline(currentFriend.chatntId)) {
        showToast("Their window is open. Close it before sending ancient mail.");
        return;
    }

    openComposeLetter();
};

function setMode(mode) {
    currentMode = mode;
    chatModeBtn.classList.toggle("active", mode === "chat");
    letterModeBtn.classList.toggle("active", mode === "letter");
}

function openComposeLetter() {
    currentMode = "letter";
    letterRecipient.textContent = currentFriend.username;

    letterCompose.classList.remove("hidden");
    letterView.classList.add("hidden");
    letterInput.value = "";

    letterOverlay.classList.remove("hidden");
    setTimeout(() => letterInput.focus(), 100);
}


// ---------------- CHAT SEND ----------------

sendBtn.onclick = sendChat;

messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
});

messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
});

function sendChat() {
    if (!currentFriend) return;

    if (!isOnline(currentFriend.chatntId)) {
        showToast("They're offline. Click Letter instead.");
        return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit("send-message", {
        receiverId: currentFriend.chatntId,
        message: text,
        mode: "chat",
        chaos
    });

    messageInput.value = "";
    messageInput.style.height = "auto";
}


// ---------------- LETTER SEND / VIEW ----------------

closeLetter.onclick = () => letterOverlay.classList.add("hidden");

letterOverlay.addEventListener("click", e => {
    if (e.target === letterOverlay) letterOverlay.classList.add("hidden");
});

sendLetterBtn.onclick = sendLetter;

function sendLetter() {
    if (!currentFriend) return;

    if (isOnline(currentFriend.chatntId)) {
        showToast("Their window is open. Close it first.");
        return;
    }

    const text = letterInput.value.trim();
    if (!text) {
        showToast("The parchment is blank.");
        return;
    }

    launchPaperPlane();

    socket.emit("send-message", {
        receiverId: currentFriend.chatntId,
        message: text,
        mode: "letter",
        chaos
    });
}

socket.on("letter-sent", message => {
    sentLetters.unshift({
        id: message.id,
        receiverId: message.receiverId,
        receiverName: message.receiverName,
        time: message.time,
        text: message.text
    });

    sentLetters = sentLetters.slice(0, 50);
    localStorage.setItem("chatnt-sent-letters", JSON.stringify(sentLetters));

    renderLetters();

    letterOverlay.classList.add("hidden");
    letterInput.value = "";

    showToast("✈ Letter launched into the wrong dimension.");
});

function renderLetters() {
    letterCount.textContent = sentLetters.length;

    if (!sentLetters.length) {
        letterList.innerHTML = `<div class="empty-folder">No letters yet.</div>`;
        return;
    }

    letterList.innerHTML = "";

    sentLetters.slice(0, 8).forEach(letter => {
        const item = document.createElement("button");
        item.className = "sent-letter";
        item.innerHTML = `
            <span class="mini-envelope">✉</span>
            <div>
                <strong>TO ${escapeHTML(letter.receiverName)}</strong>
                <small>Click to view letter</small>
            </div>
        `;

        item.onclick = () => openSentLetter(letter);
        letterList.appendChild(item);
    });
}

function openSentLetter(letter) {
    letterRecipient.textContent = letter.receiverName;
    letterCompose.classList.add("hidden");
    letterView.classList.remove("hidden");
    letterViewText.textContent = letter.text;
    letterOverlay.classList.remove("hidden");
}


// ---------------- DELIVERY ----------------

socket.on("conversation-history", history => {
    chatMessages.innerHTML = "";

    if (!history.length) {
        chatMessages.innerHTML = `
            <div class="conversation-empty">
                <div>✦</div>
                <h3>The correspondence begins here.</h3>
                <p>Say something perfectly understandable.</p>
            </div>
        `;
        return;
    }

    history.forEach(message => {
        const mine = message.senderId === me.chatntId;
        displayMessage(message, mine);
    });

    scrollMessages();
});

socket.on("message-sent", message => {
    // For a letter, show only a compact clickable event in chat.
    // The actual parchment is kept in the Letters Sent folder.
    if (message.mode === "letter") {
        if (currentFriend?.chatntId === message.receiverId) {
            displayLetterEvent(message, true);
            scrollMessages();
        }
        return;
    }

    if (currentFriend &&
        message.senderId === me.chatntId &&
        message.receiverId === currentFriend.chatntId) {

        displayMessage(message, true);
        scrollMessages();
    }
});

socket.on("receive-message", message => {
    if (!friends[message.senderId]) {
        friends[message.senderId] = {
            chatntId: message.senderId,
            username: message.senderName
        };
        saveFriends();
    }

    renderFriends();

    if (currentFriend?.chatntId === message.senderId) {
        if (message.mode === "letter") {
            // Receiver sees a small notification in chat.
            displayLetterEvent(message, false);
        } else {
            displayMessage(message, false);
        }

        scrollMessages();
    } else {
        showToast(`✉ New letter from ${message.senderName}`);
    }
});

socket.on("message-error", text => showToast(text));

function displayMessage(message, mine) {
    const row = document.createElement("article");
    row.className = `message ${mine ? "mine" : "theirs"} arrive`;

    row.innerHTML = `<div class="chat-bubble">${escapeHTML(message.text)}</div>`;
    chatMessages.appendChild(row);
}

function displayLetterEvent(message, mine) {
    const row = document.createElement("article");
    row.className = `message ${mine ? "mine" : "theirs"} arrive`;

    row.innerHTML = `
        <button class="letter-event">
            <div class="letter-event-icon">✉</div>
            <div class="letter-event-copy">
                <strong>${mine ? "LETTER SENT" : "LETTER RECEIVED"}</strong>
                <span>${mine ? "Click to view your sent letter" : "Click to open the ancient correspondence"}</span>
            </div>
            <b>›</b>
        </button>
    `;

    row.querySelector(".letter-event").onclick = () => {
        if (mine) {
            const letter = sentLetters.find(x => x.id === message.id);
            if (letter) openSentLetter(letter);
        } else {
            // Receiver can view the corrupted received parchment.
            letterRecipient.textContent = message.senderName;
            letterCompose.classList.add("hidden");
            letterView.classList.remove("hidden");
            letterViewText.textContent = message.text;
            letterOverlay.classList.remove("hidden");
        }
    };

    chatMessages.appendChild(row);
}

function scrollMessages() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}


// ---------------- END CHAT ----------------

endChatBtn.onclick = () => {
    if (!currentFriend) return;

    const name = currentFriend.username;
    if (!confirm(`End the correspondence with ${name}?`)) return;

    socket.emit("end-chat", currentFriend.chatntId);

    delete friends[currentFriend.chatntId];
    saveFriends();

    currentFriend = null;
    chatView.classList.add("hidden");
    welcome.classList.remove("hidden");

    renderFriends();
};

socket.on("chat-ended", data => {
    if (!currentFriend || currentFriend.chatntId !== data.chatntId) return;

    delete friends[data.chatntId];
    saveFriends();

    currentFriend = null;
    chatView.classList.add("hidden");
    welcome.classList.remove("hidden");

    renderFriends();
    showToast("The correspondence has ended.");
});


// ---------------- CHAOS ----------------

chaosSlider.oninput = () => {
    chaos = Number(chaosSlider.value);
    chaosValue.textContent = `${chaos}%`;
    chaosLabel.textContent = `${chaos}%`;
};


// ---------------- COPY ----------------

copyIdBtn.onclick = async () => {
    try {
        await navigator.clipboard.writeText(me.chatntId);
        copyIdBtn.textContent = "Copied!";
        setTimeout(() => copyIdBtn.textContent = "Copy", 1100);
    } catch {
        showToast(`Your Chatn't ID is ${me.chatntId}`);
    }
};


// ---------------- PAPER PLANE ----------------

function launchPaperPlane() {
    const plane = document.createElement("div");
    plane.className = "flying-plane";
    plane.innerHTML = `<span>✦</span>`;
    document.body.appendChild(plane);

    requestAnimationFrame(() => plane.classList.add("fly"));

    setTimeout(() => plane.remove(), 1800);
}


// ---------------- HELPERS ----------------

function initial(name) {
    return (name || "?").charAt(0).toUpperCase();
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}