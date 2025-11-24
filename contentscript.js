if (typeof chrome !== 'undefined') {var browser = chrome;}

let KaraokeBunny = {
	loaded: false,
	videoEnded: false,
	popped: false,
	connect: function() {
        KaraokeBunny.backgroundPort = browser.runtime.connect({name: 'karaokebunny-content-script'});
        KaraokeBunny.backgroundPort.onDisconnect.addListener(KaraokeBunny.connect);
        
        KaraokeBunny.backgroundPort.onMessage.addListener(msg => {
			if (msg.message.name == 'unpop') {
				KaraokeBunny.showSongQueue();
			}
        });
    },
	showSongQueue: function() {
		$(".karaokebunny-sidebar").fadeIn('slow');
		$(".karaokebunny-main").removeClass('karaokebunny-popped');
		KaraokeBunny.popped = false;
		this.title = 'Popout Song Queue';
		$(".karaokebunny-button-popout").attr('src', KaraokeBunnyUtil.getURL('img/popout.png'));
	},
	nextSong: function(song) {
		let timeout = 5;
		$('.karaokebunny-current-title').text('Next up: ' + song.title);
		$('.karaokebunny-current-artist').text('in  ' + timeout);
		$('.karaokebunny-current-duration').text('');

		function countdown() {
			timeout--;
			$('.karaokebunny-current-artist').text('in  ' + timeout);
			if (timeout == 1) {
				window.location = 'https://www.youtube.com/watch?v=' + song.video_id + '#KaraokeBunny';
			}
		}
		setInterval(countdown, 1000);
	},
	videoEnded: function() {
		KaraokeBunny.videoEnded = true;

		let currentSong = KaraokeBunny.queue[0];

		if (KaraokeBunny.queue.length > 1) {
			KaraokeBunny.nextSong(KaraokeBunny.queue[1]);
		}
		else { // Queue is empty
			$.ajax({
				url: 'https://api.karaokebunny.com/queue/' + KaraokeBunny.roomCode + '/' + currentSong.song_id, 
				method: 'DELETE',
				crossDomain: true
			});

			$('.karaokebunny-current-title').text('Queue empty');
			$('.karaokebunny-current-artist').text('Time for another song?');
			$('.karaokebunny-current-duration').text('');
		}
	},
	playButtonClick: function() {
		KaraokeBunny.video.play();
	},
	pauseButtonClick: function() {
		KaraokeBunny.video.pause();
	},
	popoutClick: function() {
		if (KaraokeBunny.popped) {
			KaraokeBunnyUtil.sendMessage({name: "unpop"});
			KaraokeBunny.showSongQueue();
		}
		else {
			KaraokeBunnyUtil.sendMessage({name: "pop", width: Math.round(screen.width), roomCode: KaraokeBunny.roomCode, queue: KaraokeBunny.queue, currentPosition: KaraokeBunny.currentPosition});
			$(".karaokebunny-sidebar").hide();
			$(".karaokebunny-main").addClass('karaokebunny-popped');
			KaraokeBunny.popped = true;
			this.title = 'Unpop Song Queue';
			$(".karaokebunny-button-popout").attr('src', KaraokeBunnyUtil.getURL('img/unpop.png'));
		}
	},
	setFullScreen: function() {
		if (!document.fullscreenElement) {
			document.body.requestFullscreen();
			document.body.setAttribute("fullscreen"," ");
			this.title = 'Leave fullscreen mode';
		} else {
			document.exitFullscreen();
			document.body.removeAttribute("fullscreen");
			this.title = 'Enter fullscreen mode';
		}
	},
	refresh: function() {
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
		let durationDiv = $('.karaokebunny-total');
		if (durationDiv.length == 1) {
			let total = Math.round(parseInt(durationDiv[0].dataset.duration) - KaraokeBunny.video.currentTime);
			durationDiv.text(KaraokeBunnyUtil.formatDuration(total));
		}

		//console.log(queue);
		if (queue.length == 0) {
			if (document.title == 'Welcome to KaraokeBunny - YouTube') {
				$('.karaokebunny-current-title').text('Welcome to Karaoke Bunny');
			}
			return;
		}

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

		if (KaraokeBunny.popped) {
			KaraokeBunnyUtil.sendMessage({name: "loadQueue", roomCode: KaraokeBunny.roomCode, queue: KaraokeBunny.queue, currentPosition: KaraokeBunny.currentPosition});
		}

		if (JSON.stringify(KaraokeBunny.queue) == JSON.stringify(queue)) {
			return;
		}

		// If the current song isn't in the queue at all, redirect to the first song.
		if (KaraokeBunny.currentPosition === 0) {
			//console.log(queue[0]);
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

		KaraokeBunny.queue = queue;

		if (!KaraokeBunny.popped) {
			$('.karaokebunny-queue').replaceWith(KaraokeBunnyUtil.getQueueDiv(KaraokeBunny.queue, KaraokeBunny.currentPosition));
		}
		
		$('body').fadeIn("slow");
	},
	initialise: async function() {
		let params = new URLSearchParams(document.location.search);
		KaraokeBunny.nowPlaying = params.get("v");

		let body = null;

		while (body === null || body.length == 0) {
			body = $('body');
			await KaraokeBunnyUtil.sleep(10);
		}
		body.hide();

		console.log('KaraokeBunny running');
		KaraokeBunnyUtil.injectCSSFile(KaraokeBunnyUtil.getURL("karaokebunny.css"));
		KaraokeBunnyUtil.injectCSSFile("https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap");

		let player = null;

		while (player === null) {
			player = document.querySelector('#ytd-player');
			await KaraokeBunnyUtil.sleep(10);
		}

		// Replace the non video elements with our own queue and track display
		// Create header
		let header = document.createElement("div");
		header.className = "karaokebunny-header";
		let headerLogo = document.createElement("div");
		headerLogo.className = 'karaokebunny-logo';
		header.appendChild(headerLogo);
		let headerText = document.createElement("span");
		headerText.appendChild(document.createTextNode("Karaoke Bunny"));
		headerText.className = 'karaokebunny-header-text';
		header.appendChild(headerText);

		let playButton = document.createElement("button");
		playButton.className = 'karaokebunny-play-button';
		playButton.title = 'Play';
		let playImage = document.createElement("img");
		playImage.src = KaraokeBunnyUtil.getURL('img/play.png');
		playImage.className = 'karaokebunny-button-image';
		playButton.appendChild(playImage);

		$(playButton).on("click", KaraokeBunny.playButtonClick);
		let pauseButton = document.createElement("button");
		pauseButton.className = 'karaokebunny-pause-button';
		pauseButton.title = 'Pause';
		let pauseImage = document.createElement("img");
		pauseImage.src = KaraokeBunnyUtil.getURL('img/pause.png');
		pauseImage.className = 'karaokebunny-button-image';
		pauseButton.appendChild(pauseImage);
		$(pauseButton).on("click", KaraokeBunny.pauseButtonClick);

		let fullscreenButton = document.createElement("button");
		fullscreenButton.className = 'karaokebunny-fullscreen-button';
		fullscreenButton.title = 'Enter fullscreen mode';
		let fullscreenImage = document.createElement("img");
		fullscreenImage.src = KaraokeBunnyUtil.getURL('img/fullscreen.png');
		fullscreenImage.className = 'karaokebunny-button-image';
		fullscreenButton.appendChild(fullscreenImage);
		
		$(fullscreenButton).on("click", KaraokeBunny.setFullScreen);

		let popoutButton = document.createElement("button");
		popoutButton.className = 'karaokebunny-popout-button';
		popoutButton.title = 'Popout Song Queue';
		let popoutImage = document.createElement("img");
		popoutImage.src = KaraokeBunnyUtil.getURL('img/popout.png');
		popoutImage.className = 'karaokebunny-button-image karaokebunny-button-popout';
		popoutButton.appendChild(popoutImage);
		$(popoutButton).on("click", KaraokeBunny.popoutClick);
		

		header.appendChild(playButton);
		header.appendChild(pauseButton);
		header.appendChild(fullscreenButton);
		header.appendChild(popoutButton);

		let sidebar = KaraokeBunnyUtil.getSidebarDiv();

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

		let oldBody = $('body');
		KaraokeBunny.video = $('video').get(0);

		let main = document.createElement("div");
		main.className = 'karaokebunny-main';
		let mainInner = document.createElement("div");
		mainInner.className = 'karaokebunny-main-inner';
		let videoContainer = document.createElement("div");
		videoContainer.className = 'karaokebunny-main-video';

		//videoContainer.appendChild(document.getElementById('player'));
		videoContainer.appendChild(KaraokeBunny.video);
		mainInner.appendChild(videoContainer);
		main.appendChild(mainInner);
		main.appendChild(footer);
		
		let newBody = document.createElement("body");
		newBody.appendChild(header);
		newBody.appendChild(main);
		newBody.appendChild(sidebar);
		
		//$('#masthead').replaceWith(header);
		//$('#secondary').replaceWith(sidebar);
		//$('#below').replaceWith(footer);
		$(newBody).hide();
		oldBody.replaceWith(newBody);
		
		// Setup video finish event handler
		//console.log(KaraokeBunny.video);
		KaraokeBunny.video.addEventListener('ended', KaraokeBunny.videoEnded);
		//console.log(video);
		//console.log($('#ytd-player'));

		if (KaraokeBunnyUtil.isDevMode()) {
			console.log('dev mode');
			KaraokeBunny.video.pause();
		}
		else {
			KaraokeBunny.video.play();
		}
		
		// Get the room code from local storage
		browser.storage.local.get(['roomCode'], async function(data) {
			if (data.roomCode) {
				KaraokeBunny.roomCode = data.roomCode;
			}
			else {
				// No roomCode found - ask the server to generate a unique one and then store it.
				let response = await KaraokeBunnyUtil.apiRequest('room');
				KaraokeBunny.roomCode = response['room_code'];
				browser.storage.local.set({
					roomCode: KaraokeBunny.roomCode
				});
			}
			
			console.log('Room code: ' + KaraokeBunny.roomCode);
			new QRCode(document.getElementById("karaokebunny-qrcode"), "https://app.karaokebunny.com/#Search/" + KaraokeBunny.roomCode);

			let promoDiv = $('div.promo-title');
			if (promoDiv.text() == "This video isn\'t available anymore") {
				console.log('video not available');
				$.ajax({
					url: 'https://api.karaokebunny.com/video/' + KaraokeBunny.roomCode + '/' + KaraokeBunny.nowPlaying, 
					method: 'DELETE',
					crossDomain: true,
					success: function(response) {
						KaraokeBunny.loadQueue(JSON.parse(response));
					}
				});
			}
			else {
				KaraokeBunnyUtil.apiRequest('queue/' + KaraokeBunny.roomCode).then((response) => {
					KaraokeBunny.loadQueue(response);
				});
			}


			KaraokeBunny.timer = setInterval(KaraokeBunny.refresh, 5000);
			KaraokeBunny.connect();
			KaraokeBunny.loaded = true;
		});
	}
}

if (window.location.hash && window.location.hash == '#KaraokeBunny') {
	KaraokeBunny.initialise();
}
if (window.location.host.toLowerCase().indexOf("karaokebunny.com") > -1) {
	$(document).ready(function() {
		$('body').addClass('karaokebunny-extension-running');
	});
}

