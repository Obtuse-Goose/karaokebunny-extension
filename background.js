if (typeof chrome !== 'undefined') {var browser = chrome;}

function getFile(url, callback) {
	fetch(url)
		.then(response => response.text())
		.then(callback);
}

// Handle simple requests
function onRequest(request, sender, sendResponse) {

	if (request.name == "getFile") {
		console.log(request);
		getFile(request.url, (response) => {
			sendResponse({'url': request.url, 'data': response});
		});
	}

	return true;
};


// Listen for the content script to send a message to the background page.
// Chrome, Opera, Firefox or Edge
// Simple messages
browser.runtime.onMessage.addListener(onRequest);
// Persistent connections
//browser.runtime.onConnect.addListener(onConnect);

// On first install open the options page
browser.runtime.onInstalled.addListener((details) => {
	if (details.reason == 'install') {
		//openURL(browser.runtime.getURL('options.html'));
	}
});
