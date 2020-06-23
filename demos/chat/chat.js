// Create a node
const msgKey = "/chat";
const usrKey = "/usr";
const browserId = localStorage.browserId || `B-${randomString(10)}`;
localStorage.browserId = browserId;
let nodeCache = localStorage.nodeCache ? JSON.parse(localStorage.nodeCache) : {pid: browserId};

const node = require('braid.js')(nodeCache);

node.default(`${msgKey}/*`, path => []);
node.default(msgKey, []);
node.default(usrKey, {});

show_debug = true;

const socket = require('http1-client.js')({node, url: 'http://localhost:3009/'});

// UI Code
let createListeners = function () {

	// Local copy of variables
	let nMessages = 0;
	let users = {};
	let messages = [];
	// Subscribe for updates to a resource
	node.get(msgKey, update_messages);
	node.get(usrKey, newVal => {
		users = newVal;
		if (!users[browserId])
			setUsername(generatedUsername);
		nameBox.value = users[browserId];
		update_messages(messages);
	});
	// Cache braid state
	function cache() {
		nodeCache = {pid: browserId,
					 resources: node.resources}
		//localStorage.
	}
	setInterval(cache, 10000);
	document.addEventListener('unload', () => {
		cache();
		socket.disable();
	})
	
	//// ----- Messagebox rendering and interactability -----
	const messageBox = document.getElementById("react-messages");
	let render_username = function(name) {
		return (name && users[name]) ? users[name] : "Anonymous";
	}
	// Message formatting
	let format_section = function(section, index) {
		if (typeof(section) == "string" || !section.type)
			return React.createElement("span", {className: "msg-plain-text", key: index}, section);
		if (section.type == "usr")
			return React.createElement("span", {className: "msg-user-ref", key: index}, `@${render_username(section.user)}`);
		return React.createElement("span", {className: "msg-plain-text", key: index}, section);
	}
	let format_header = function(msg) {
		let now = new Date();
		let msgDate = new Date(msg.time);
		let timestamp = now.getDate() == msgDate.getDate() ?
			msgDate.toLocaleTimeString() : msgDate.toLocaleDateString();

		let username = render_username(msg.user);
		return [React.createElement("span", {className: "user-id", key:"username"}, username),
				React.createElement("span", {className: "timestamp", key: "time"}, timestamp)];
	}
	let format_message = function(msg, i, msgs) {
		let collapse = i && (msgs[i-1].user == msg.user) && (msg.time - msgs[i-1].time < 1200000);
		// Parse the message
		
		let renderedMessage = msg.body.map(format_section);
		if (collapse) {
			return React.createElement('div', {className:"msg msg-collapse", key: i},
				React.createElement("div", {className: "msg-body", key: "text"}, renderedMessage));
		} else {
			let renderedHeader = format_header(msg);
			return React.createElement('div', {className:"msg", key: i},
				[React.createElement("div", {className: "msg-header", key: "head"}, renderedHeader),
				 React.createElement("div", {className: "msg-body", key: "text"}, renderedMessage)]);
		}
	}
	function update_messages(newVal) {
		// Check scrolling 
		let shouldScroll = true;
		if (nMessages) {
			let furthest_scroll = document.getElementsByClassName("msg")[nMessages - 1].getBoundingClientRect().top;
			let box_bottom = messageBox.getBoundingClientRect().bottom;
			// If the last message is off the screen, we shouldn't scroll
			shouldScroll = box_bottom > furthest_scroll;
		}
		let MessageList = React.createElement('div', {className: "messageBox"}, newVal.map(format_message));
		ReactDOM.render(
			MessageList,
			messageBox,
			() => {
				if (shouldScroll)
					messageBox.scrollTop = messageBox.scrollHeight - messageBox.clientHeight;
			}
		);
		
		messages = newVal;
		nMessages = newVal.length;

	}
	//// ---- Input field handlers ----
	// Enable sending of messages
	let sendbox = document.getElementById("send-box");
	function submit() {
		if (!sendbox.value.length)
			return;
		// Preprocess outgoing message
		let messageParts = sendbox.value.split(/(@\w+)/ig);
		// Now, the odd-numbered indices contain the split tokens
		for (let i = 1; i < messageParts.length; i+= 2) {
			let x = messageParts[i];
			let name = x.substring(1, x.length);
			let nameId = Object.keys(users).find(key => users[key] == name);
			if (nameId)
				messageParts[i] = {type: "usr", user: nameId};
		}
		let sendTime = new Date().getTime();
		let messageBody = JSON.stringify([{user: browserId, time: sendTime, body: messageParts}]);
		node.set(msgKey, null, `[${nMessages}:${nMessages}] = ${messageBody}`);
		sendbox.value = "";
	}

	document.getElementById("send-msg").addEventListener("click", submit);
	sendbox.onkeydown = e => {
        if (e.keyCode == 13 && !e.shiftKey) {e.preventDefault(); submit()}};

    //// ---- Settings bar ----
    // Clicking on the settings icon toggles it
   	// Username Changing
   	let nameBox = document.getElementById("username-change");

    nameBox.onchange = e => {
		e.preventDefault();
		let newName = nameBox.value.replace(/\W/g, '');
		// Change username
		nameBox.value = newName;
		setUsername(newName);
    };
    // Username stuff
	const names = ["Bob", "Alice", "Joe", "Fred", "Mary", "Linda", "Mike", "Greg", "Raf"];
	let name = names[Math.floor(Math.random() * names.length)];
	let number = Math.floor(Math.random() * 1000);
	const generatedUsername = `${name}${number}`;

	function setUsername(name) {
		let escapedId = JSON.stringify(browserId);
		let escapedName = JSON.stringify(name);
		setTimeout(() => node.set(usrKey, null, `[${escapedId}] = ${escapedName}`), 1);
	}
}

if (document.readyState === "complete" ||
   (document.readyState !== "loading" && !document.documentElement.doScroll) ) {
	createListeners();
} else {
	document.addEventListener("DOMContentLoaded", createListeners);
}
function randomString(length) {
    let result = '';
    let chars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}