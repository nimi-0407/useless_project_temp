const socket = io();

let me = {};
let currentFriend = null;
const IDENTITY_KEY = "chatnt-window-identity-v8";
let currentMode = "chat";
let chaos = 55;

const friends = JSON.parse(localStorage.getItem("chatnt-friends-v10") || "{}");
let sentLetters = JSON.parse(localStorage.getItem("chatnt-sent-eletters-v10") || "[]");
let receivedLetters = JSON.parse(localStorage.getItem("chatnt-received-eletters-v10") || "[]");
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
const receivedLetterList = $("receivedLetterList");
const chatCount = $("chatCount");
const letterCount = $("letterCount");
const receivedLetterCount = $("receivedLetterCount");

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

    const saved = JSON.parse(sessionStorage.getItem(IDENTITY_KEY) || "null");
    socket.emit("register", {
        name,
        chatntId: saved?.chatntId || ""
    });
}

socket.on("registered", data => {
    me = data;
    sessionStorage.setItem(IDENTITY_KEY, JSON.stringify(data));
    myName.textContent = me.username;
    myId.textContent = me.chatntId;
    myAvatar.textContent = initial(me.username);

    setupScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");

    renderFriends();
    renderLetters();
    renderReceivedLetters();
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

    // E-Letters are always available. They can be delivered live or queued if offline.
    letterModeBtn.disabled = false;

    letterNotice.classList.add("hidden");

    if (!on && currentMode === "chat") setMode("letter");
}


// ---------------- FRIEND FOLDER ----------------

function saveFriends() {
    localStorage.setItem("chatnt-friends-v10", JSON.stringify(friends));
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
        item.dataset.friendId = id;

        item.innerHTML = `
            <div class="friend-avatar">${escapeHTML(initial(friend.username))}</div>
            <div class="friend-copy">
                <strong>${escapeHTML(friend.username)}</strong>
                <small class="friend-id">ID: ${escapeHTML(friend.chatntId)}</small>
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

    const text = letterInput.value.trim();
    if (!text) {
        showToast("The pamphlet is blank.");
        return;
    }

    const recipientId = currentFriend.chatntId;
    const recipientName = currentFriend.username;
    const pamphlet = document.querySelector(".pamphlet");
    const composeOverlay = letterOverlay;

    sendLetterBtn.disabled = true;

    // Remember the written letter locally right away so the sender can see it
    // even before the server acknowledgement arrives.
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const localLetter = {
        id: localId,
        receiverId: recipientId,
        receiverName: recipientName,
        time: new Date().toISOString(),
        text
    };
    sentLetters.unshift(localLetter);
    sentLetters = sentLetters.slice(0, 50);
    localStorage.setItem("chatnt-sent-eletters-v10", JSON.stringify(sentLetters));
    renderLetters();

    // Close the pamphlet without changing the underlying space background.
    if (pamphlet) pamphlet.classList.add("transforming-to-plane");

    socket.emit("send-message", {
        receiverId: recipientId,
        receiverName,
        message: text,
        mode: "letter",
        chaos
    });

    // The sender sees the paper-plane flight too, aimed at the recipient card.
    // The recipient receives a separate in-flight event so their screen also
    // shows the plane crossing their existing space scene.
    setTimeout(() => {
        composeOverlay.classList.add("hidden");
        if (pamphlet) pamphlet.classList.remove("transforming-to-plane");
        letterInput.value = "";
        sendLetterBtn.disabled = false;
        launchPaperPlane(recipientId);
    }, 800);
}

socket.on("letter-sent", message => {
    const localIndex = sentLetters.findIndex(x =>
        x.receiverId === message.receiverId &&
        x.text === (message.original || message.text) &&
        x.id.startsWith("local-")
    );

    const finalLetter = {
        id: message.id,
        receiverId: message.receiverId,
        receiverName: message.receiverName,
        time: message.time,
        text: message.original || message.text
    };

    if (localIndex >= 0) sentLetters[localIndex] = finalLetter;
    else sentLetters.unshift(finalLetter);

    sentLetters = sentLetters.slice(0, 50);
    localStorage.setItem("chatnt-sent-eletters-v10", JSON.stringify(sentLetters));
    renderLetters();

    // Show the compact sent event in the sender's current conversation.
    if (currentFriend?.chatntId === message.receiverId &&
        ![...chatMessages.querySelectorAll("[data-letter-id]")].some(el => el.dataset.letterId === message.id)) {
        displayLetterEvent(message, true);
        const last = chatMessages.lastElementChild;
        if (last) last.dataset.letterId = message.id;
        scrollMessages();
    }

    showToast(`✈ E-Letter sent to ${message.receiverName}`);
});

// The recipient sees the plane cross their existing space background.
// Nothing underneath changes colour and no parchment overlay is opened.
socket.on("letter-in-flight", data => {
    launchIncomingPaperPlane();
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

function renderReceivedLetters() {
    receivedLetterCount.textContent = receivedLetters.length;

    if (!receivedLetters.length) {
        receivedLetterList.innerHTML = `<div class="empty-folder">No letters received.</div>`;
        return;
    }

    receivedLetterList.innerHTML = "";

    receivedLetters.slice(0, 8).forEach(letter => {
        const item = document.createElement("button");
        item.className = "sent-letter received-letter";
        item.innerHTML = `
            <span class="mini-envelope">📨</span>
            <div>
                <strong>FROM ${escapeHTML(letter.senderName)}</strong>
                <small>Click to open received letter</small>
            </div>
        `;
        item.onclick = () => openReceivedLetter(letter);
        receivedLetterList.appendChild(item);
    });
}

function openReceivedLetter(letter) {
    letterRecipient.textContent = letter.senderName;
    letterCompose.classList.add("hidden");
    letterView.classList.remove("hidden");
    letterViewText.textContent = letter.text;
    letterOverlay.classList.remove("hidden");
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

        if (message.mode === "letter") {
            if (!mine && !receivedLetters.some(x => x.id === message.id)) {
                receivedLetters.unshift({
                    id: message.id,
                    senderId: message.senderId,
                    senderName: message.senderName,
                    time: message.time,
                    text: message.text
                });
            }
            displayLetterEvent(message, mine);
        } else {
            displayMessage(message, mine);
        }
    });

    receivedLetters = receivedLetters.slice(0, 50);
    localStorage.setItem("chatnt-received-eletters-v10", JSON.stringify(receivedLetters));
    renderReceivedLetters();

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
            receivedLetters.unshift({
                id: message.id,
                senderId: message.senderId,
                senderName: message.senderName,
                time: message.time,
                text: message.text
            });
            receivedLetters = receivedLetters.slice(0, 50);
            localStorage.setItem("chatnt-received-eletters-v10", JSON.stringify(receivedLetters));
            renderReceivedLetters();
            displayLetterEvent(message, false);
        } else {
            displayMessage(message, false);
        }

        scrollMessages();
    } else {
        if (message.mode === "letter") {
            receivedLetters.unshift({
                id: message.id,
                senderId: message.senderId,
                senderName: message.senderName,
                time: message.time,
                text: message.text
            });
            receivedLetters = receivedLetters.slice(0, 50);
            localStorage.setItem("chatnt-received-eletters-v10", JSON.stringify(receivedLetters));
            renderReceivedLetters();
            showToast(`📨 Letter received from ${message.senderName} — open Letters Received`);
        } else {
            showToast(`New message from ${message.senderName}`);
        }
    }
});

socket.on("message-error", text => showToast(text));

function displayMessage(message, mine) {
    const row = document.createElement("article");
    row.className = `message ${mine ? "mine" : "theirs"} arrive`;

    row.innerHTML = `<div class="chat-bubble">${escapeHTML(mine && message.original ? message.original : message.text)}</div>`;
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

function launchIncomingPaperPlane() {
    const plane = document.createElement("div");
    plane.className = "flying-plane incoming-plane";
    plane.innerHTML = `<span>✦</span>`;

    // Start at the right side and sweep across the already-visible space scene.
    // No overlay, no background colour change.
    plane.style.left = `${window.innerWidth + 90}px`;
    plane.style.top = `${window.innerHeight * 0.28}px`;
    document.body.appendChild(plane);

    requestAnimationFrame(() => plane.classList.add("fly-across-screen"));
    setTimeout(() => plane.remove(), 4300);
}

function launchPaperPlane(recipientId) {
    const plane = document.createElement("div");
    plane.className = "flying-plane paper-plane-transform";
    plane.innerHTML = `<span>✦</span>`;
    document.body.appendChild(plane);

    const target = recipientId
        ? document.querySelector(`.friend-item[data-friend-id="${CSS.escape(recipientId)}"]`)
        : null;

    // Start where the centre of the pamphlet was.
    const startX = window.innerWidth * 0.58;
    const startY = window.innerHeight * 0.50;

    let targetX = window.innerWidth * 0.16;
    let targetY = window.innerHeight * 0.45;

    if (target) {
        const r = target.getBoundingClientRect();
        targetX = r.left + r.width * 0.55;
        targetY = r.top + r.height * 0.50;
    }

    plane.style.left = `${startX}px`;
    plane.style.top = `${startY}px`;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    plane.style.setProperty("--dx", `${dx}px`);
    plane.style.setProperty("--dy", `${dy}px`);
    plane.style.setProperty("--dx25", `${dx * .25}px`);
    plane.style.setProperty("--dy25", `${dy * .25}px`);
    plane.style.setProperty("--dx55", `${dx * .55}px`);
    plane.style.setProperty("--dy55", `${dy * .55}px`);
    plane.style.setProperty("--dx82", `${dx * .82}px`);
    plane.style.setProperty("--dy82", `${dy * .82}px`);
    plane.style.setProperty("--angle", `${angle}deg`);

    // It appears as the folded paper plane and holds in the air for one second.
    requestAnimationFrame(() => plane.classList.add("transform-to-plane"));
    setTimeout(() => plane.classList.add("fly-to-person"), 1000);
    setTimeout(() => plane.remove(), 5200);
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
socket.on("session-replaced", () => {
    showToast("This Chatn't ID is open in another window.");
});
