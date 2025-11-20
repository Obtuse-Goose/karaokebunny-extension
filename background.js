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
		try {
			chrome.windows.remove(KaraokeBunny.popupWindow.id);
		}
		catch {
			// Errors if the window has already been closed.
		}
	}
	else if (request.name == "loadQueue") {
		console.log(request.queue);
		//KaraokeBunny.popupWindow.postMessage(request);
		if (KaraokeBunny.popupWindow && KaraokeBunny.popupWindow.tabs.length == 1) {
			chrome.tabs.sendMessage({
				tabId: KaraokeBunny.popupWindow.tabs[0].id,
				message: request
			});
		}
	}

	return true;
};


// Listen for the content script to send a message to the background page.
// Chrome, Opera, Firefox or Edge
// Simple messages
browser.runtime.onMessage.addListener(onRequest);
// Persistent connections
//browser.runtime.onConnect.addListener(onConnect);

// On first install launch the video page
browser.runtime.onInstalled.addListener((details) => {
	if (details.reason == 'install') {
		browser.tabs.create({'url': "https://karaokebunny.com/launch/"});
	}
});
