if (typeof chrome !== 'undefined') {var browser = chrome;}

let KaraokeBunny = {};

function getURL(filename) {
	return browser.runtime.getURL(filename);
}

function getFile(url, callback) {
	fetch(url)
		.then(response => response.text())
		.then(callback);
}

// Handle simple requests
function onRequest(request, sender, sendResponse) {

	if (request.name == "getFile") {
		getFile(request.url, (response) => {
			sendResponse({'url': request.url, 'data': response});
		});
	}
	else if (request.name == "pop") {
		KaraokeBunny.lastMessage = request;
		browser.windows.create({
			url: getURL('queue.html'),
			type: 'popup',
			width: 800,
			left: request.width - 800
		}, function (newWindow) {
			KaraokeBunny.popupWindow = newWindow;
		});
	}
	else if (request.name == "unpop") {
		// Check the window still exists before closing it
		browser.windows.getAll().then((windows) => {
			for (let i=0; i<windows.length; i++) {
				if (windows[i].id == KaraokeBunny.popupWindow.id) {
					browser.windows.remove(KaraokeBunny.popupWindow.id);
					delete KaraokeBunny.popupWindow;
				}
			}
		});
	}
	else if (request.name == "loadQueue") {
		if (KaraokeBunny.popupWindow && KaraokeBunny.popupWindow.tabs.length == 1) {
			KaraokeBunny.port.postMessage({
				message: request
			});
		}
	}

	return true;
};

function onConnect(port) {
	if (port.name != 'karaokebunny') return;
	KaraokeBunny.port = port;
	port.postMessage({
		message: KaraokeBunny.lastMessage
	});

	//port.onMessage.addListener(onMessage);
	//port.onDisconnect.addListener(deleteTimer);
	//port._timer = setTimeout(forceReconnect, 250e3, port);

	return true;
}


// Listen for the content script to send a message to the background page.
browser.runtime.onMessage.addListener(onRequest);
// Setup a persistent connection so we can send messages to the popout song queue.
browser.runtime.onConnect.addListener(onConnect);

// On first install launch the video page
browser.runtime.onInstalled.addListener((details) => {
	if (details.reason == 'install') {
		browser.tabs.create({'url': "https://karaokebunny.com/launch/"});
	}
});
