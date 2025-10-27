if (typeof chrome !== 'undefined') {var browser = chrome;}

let KaraokeBunny = {
	loaded: false,
	videoEnded: false,
	apiUrl: 'https://api.karaokebunny.com/',
	sendMessage(message) {
		return new Promise((resolve, reject) => {
			browser.runtime.sendMessage(message, response => resolve(response));
		});
	},
	ajax: function(url) {
		return new Promise((resolve, reject) => {
			KaraokeBunny.sendMessage({'name': 'getFile', 'url': url}).then((response) => {
				resolve(response.data);
			});
		});
	},
	getURL: function(filename) {
		return browser.runtime.getURL(filename);
	},
	apiRequest: function(route) {
		return new Promise((resolve, reject) => {
			KaraokeBunny.sendMessage({'name': 'getFile', 'url': KaraokeBunny.apiUrl + route}).then((response) => {
				resolve(JSON.parse(response.data));
			});
		});
	},
	injectCSSFile: function(url) {
		let link = document.createElement("link");
		link.href = url;
		link.type = "text/css";
		link.rel = "stylesheet";
		document.getElementsByTagName("head")[0].appendChild(link);
	},
	formatDuration: function(duration) {
		if (!duration) return '';
		let hours = Math.floor(duration / 3600);
		let minutes = Math.floor(duration / 60);
		let seconds = duration % 60;
		if (hours > 0 && minutes.toString().length == 1) minutes = '0' + minutes;
		if (minutes > 0 && seconds.toString().length == 1) seconds = '0' + seconds;
		
		return (hours > 0 ? hours + ':' : '') + (minutes > 0 ? minutes + ':' : '') + seconds;
	},
	sleep: function(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	},
	getCurrentUrl: function() {
		if (typeof(window) === 'undefined') {return ''}
		if (typeof(window.document) === 'undefined') {return ''}
		if (typeof(window.document.location) === 'undefined') {return ''}
		return window.document.location.href.toLowerCase();
	},
	nextVideo: function() {
		KaraokeBunny.videoEnded = true;

		let song = KaraokeBunny.queue[KaraokeBunny.currentPosition-1];

		/*
		Was going to delete the finished song from the queue here but don't think it's necessary as it'll get cleared when we load the next video anyway.
		$.ajax({
			url: 'https://api.karaokebunny.com/queue/' + KaraokeBunny.roomCode + '/' + song.song_id, 
			method: 'DELETE',
			crossDomain: true
		});
		*/

		if (KaraokeBunny.queue.length > KaraokeBunny.currentPosition) {
			let nextSong = KaraokeBunny.queue[KaraokeBunny.currentPosition];

			let timeout = 5;
			$('.karaokebunny-current-title').text('Next up: ' + nextSong.title);
			$('.karaokebunny-current-artist').text('in ' + timeout);

			function countdown() {
				timeout--;
				$('.karaokebunny-added-by').text('in ' + timeout);
				if (timeout == 1) {
					window.location = 'https://www.youtube.com/watch?v=' + nextSong.video_id + '#KaraokeBunny';
				}
				setTimeout(countdown, 1000);
			}
			setTimeout(countdown, 1000);
		}
		else {
			$('.karaokebunny-current-title').text('Queue empty');
			$('.karaokebunny-current-artist').text('Time for another song?');
		}
	},
	setFullScreen: function() {
		if (!document.fullscreenElement) {
			document.body.requestFullscreen();
			document.body.setAttribute("fullscreen","");
			this.title = 'Leave fullscreen mode';
		} else {
			document.exitFullscreen();
			document.body.removeAttribute("fullscreen");
			this.title = 'Enter fullscreen mode';
		}
	},
	refresh: function() {
		console.log('refresh');
		$.ajax({
			url: 'https://api.karaokebunny.com/queue/' + KaraokeBunny.roomCode, 
			method: 'GET',
			crossDomain: true,
			success: function(response) {
				KaraokeBunny.loadQueue(JSON.parse(response));
			}
		});
	},
	loadQueue: function(queue) {
		function getSongDiv(song) {			
			let link = document.createElement("a");
			link.href = 'https://www.youtube.com/watch?v=' + song.video_id + '#KaraokeBunny';

			let title = document.createElement("div");
			title.className = 'karaokebunny-title';
			title.appendChild(document.createTextNode(song.title));
			link.appendChild(title);

			let artist = document.createElement("span");
			artist.className = 'karaokebunny-artist';
			artist.appendChild(document.createTextNode(song.artist));
			link.appendChild(artist);

			let duration = document.createElement("div");
			duration.className = 'karaokebunny-duration';
			duration.appendChild(document.createTextNode(KaraokeBunny.formatDuration(song.duration)));
			link.appendChild(duration);

			let result = document.createElement("div");
			result.className = 'karaokebunny-song';
			result.appendChild(link);
			return result;
		}

		console.log(queue);
		if (queue.length == 0) return;
		if (JSON.stringify(KaraokeBunny.queue) == JSON.stringify(queue)) {
			console.log('moot');
			return;
		}

		KaraokeBunny.queue = queue;
		KaraokeBunny.currentPosition = 0;
		let pastSongs = '';
		for (let i=0; i<queue.length; i++) {
			let song = queue[i];
			if (song.video_id == KaraokeBunny.nowPlaying) {
				KaraokeBunny.currentPosition = song.position;
			}
			if (KaraokeBunny.currentPosition === 0) {
				pastSongs += song.song_id + ',';
			}
		}

		// If the current song isn't in the queue at all, redirect to the first song.
		if (KaraokeBunny.currentPosition === 0) {
			window.location = 'https://www.youtube.com/watch?v=' + queue[0].video_id + '#KaraokeBunny';
			return;
		}
		else if (KaraokeBunny.currentPosition !== 1) { // If the current song is later in the queue, remove the songs in between.
			$.ajax({
				url: 'https://api.karaokebunny.com/queue/' + KaraokeBunny.roomCode + '/' + pastSongs, 
				method: 'DELETE',
				crossDomain: true
			});
		}
		
		let queueDivInner = document.createElement("div");
		queueDivInner.className = 'karaokebunny-queue-inner';

		let totalDuration = 0;
		for (let i=0; i<queue.length; i++) {
			let song = queue[i];
			
			if (song.position == KaraokeBunny.currentPosition) { // Current song
				$('.karaokebunny-current-title').text(song.title);
				$('.karaokebunny-current-artist').text(song.artist);
				$('.karaokebunny-current-duration').text(KaraokeBunny.formatDuration(song.duration));
				//$('.karaokebunny-added-by').text('Added by ' + song.added_by);
			}
			//else if (song.position == KaraokeBunny.currentPosition+1) { // Next song
				//$('.karaokebunny-next').text('Next: ' + song.artist + ' — ' + song.title);
			//}
			else if (song.position > KaraokeBunny.currentPosition) {
				queueDivInner.appendChild(getSongDiv(song));
				totalDuration += song.duration;
			}
		}

		let queueTitle = document.createElement("div");
		queueTitle.className = 'karaokebunny-queue-title';

		let upcoming = document.createElement("span");
		upcoming.className = 'karaokebunny-artist';
		upcoming.appendChild(document.createTextNode('Upcoming Songs'));
		queueTitle.appendChild(upcoming);

		let duration = document.createElement("div");
		duration.className = 'karaokebunny-duration';
		duration.appendChild(document.createTextNode(KaraokeBunny.formatDuration(totalDuration)));
		queueTitle.appendChild(duration);

		let queueDiv = document.createElement("div");
		queueDiv.className = 'karaokebunny-queue';
		queueDiv.appendChild(queueTitle);
		queueDiv.appendChild(queueDivInner);

		$('.karaokebunny-queue').replaceWith(queueDiv);
	},
	initialise: async function() {
		let body = null;

		while (body === null || body.length == 0) {
			body = $('body');
			await KaraokeBunny.sleep(10);
		}
		body.hide();

		console.log('KaraokeBunny running');
		KaraokeBunny.injectCSSFile(KaraokeBunny.getURL("karaokebunny.css"));
		KaraokeBunny.injectCSSFile("https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap");

		let player = null;

		while (player === null) {
			player = document.querySelector('#ytd-player');
			await KaraokeBunny.sleep(10);
		}
		$('.ytp-play-button').click();

		// Replace the non video elements with our own queue and track display
		// Create header
		let header = document.createElement("div");
		header.className = "karaokebunny-header";
		header.appendChild(document.createTextNode("Karaoke Bunny"));
		let button = document.createElement("button");
		//button.appendChild(document.createTextNode("Go Fullscreen"));
		button.className = 'js-toggle-fullscreen-btn toggle-fullscreen-btn';
		button.title = 'Enter fullscreen mode';

		button.innerHTML = `
			<svg class="toggle-fullscreen-svg" width="28" height="28" viewBox="-2 -2 28 28">
				<g class="icon-fullscreen-enter">
					<path d="M 2 9 v -7 h 7" />
					<path d="M 22 9 v -7 h -7" />
					<path d="M 22 15 v 7 h -7" />
					<path d="M 2 15 v 7 h 7" />
				</g>
				
				<g class="icon-fullscreen-leave">
					<path d="M 24 17 h -7 v 7" />
					<path d="M 0 17 h 7 v 7" />
					<path d="M 0 7 h 7 v -7" />
					<path d="M 24 7 h -7 v -7" />
				</g>
			</svg>
		`;
		$(button).on("click", KaraokeBunny.setFullScreen);
		header.appendChild(button);
		$('#masthead').replaceWith(header);

		// Create sidebar for QR code and song queue
		let sidebar = document.createElement("div");
		sidebar.className = "karaokebunny-sidebar";
		let qr = document.createElement("div");
		let top = document.createElement("span");
		let bottom = document.createElement("span");
		bottom.id = 'karaokebunny-qrcode';
		qr.className = 'karaokebunny-qr';
		top.appendChild(document.createTextNode("Scan to add songs to the queue"));
		qr.appendChild(top);
		qr.appendChild(document.createElement("br"))
		qr.appendChild(bottom);
		sidebar.appendChild(qr);
		let queueDiv = document.createElement("div");
		queueDiv.className = 'karaokebunny-queue';
		sidebar.appendChild(queueDiv);		
		$('#secondary').replaceWith(sidebar);

		// Create footer for currently playing and up next
		let footer = document.createElement("div");
		footer.className = "karaokebunny-footer";
		let currentTitle = document.createElement("div");
		currentTitle.className = "karaokebunny-current-title";
		let currentArtist = document.createElement("span");
		currentArtist.className = "karaokebunny-current-artist";
		let currentDuration = document.createElement("div");
		currentDuration.className = "karaokebunny-current-duration";
		//let addedByDiv = document.createElement("div");
		//addedByDiv.className = "karaokebunny-added-by";
		footer.appendChild(currentTitle);
		footer.appendChild(currentArtist);
		footer.appendChild(currentDuration);
		//footer.appendChild(addedByDiv);
		$('#below').replaceWith(footer);

		
		// Setup video finish event handler
		let video = $('video').get(0);
		video.addEventListener('ended', KaraokeBunny.nextVideo);
		//console.log(video);
		//console.log($('#ytd-player'));
		
		$('body').show("slow");

		let params = new URLSearchParams(document.location.search);
		KaraokeBunny.nowPlaying = params.get("v");
		
		// Get the room code from local storage
		browser.storage.local.get(['roomCode'], async function(data) {
			if (data.roomCode) {
				KaraokeBunny.roomCode = data.roomCode;
			}
			else {
				// No roomCode found - ask the server to generate a unique one and then store it.
				let response = await KaraokeBunny.apiRequest('room');
				KaraokeBunny.roomCode = response['room_code'];
				browser.storage.local.set({
					roomCode: KaraokeBunny.roomCode
				});
			}
			
			new QRCode(document.getElementById("karaokebunny-qrcode"), "https://app.karaokebunny.com/#Search/" + KaraokeBunny.roomCode);

			console.log('Room code: ' + KaraokeBunny.roomCode);

			KaraokeBunny.apiRequest('queue/' + KaraokeBunny.roomCode).then((response) => {
				KaraokeBunny.loadQueue(response);
			});
		});



		KaraokeBunny.timer = setInterval(KaraokeBunny.refresh, 5000);
		
		KaraokeBunny.loaded = true;
		/*
		var skip = null;
		while (skip === null) {
			skip = qs('.ytp-skip-ad-button');
			await KaraokeBunny.sleep(10);
		}
		skip.click();
		*/
	}
	/*
	saveSettings: function(settings) {
		KaraokeBunny.sendMessage({'name': 'saveSettings', 'prefix': KaraokeBunnySettings.prefix, 'settings': settings});
	},
	
	settingsCallback: function(response) {
		if (!response) {
			console.error('Load settings failed');
			return;
		}
		
		KaraokeBunny.isTouchInterface = ('ontouchstart' in window);
	

		KaraokeBunny.loaded = true;
	}
	*/
}

if (window.location.hash && window.location.hash == '#KaraokeBunny') {
	KaraokeBunny.initialise();
}

