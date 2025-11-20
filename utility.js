let KaraokeBunnyUtil = {
	apiUrl: 'https://api.karaokebunny.com/',
	isDevMode: function() {
		return !('update_url' in browser.runtime.getManifest());
	},
	sendMessage(message) {
		return new Promise((resolve, reject) => {
			browser.runtime.sendMessage(message, response => resolve(response));
		});
	},
	ajax: function(url) {
		return new Promise((resolve, reject) => {
			KaraokeBunnyUtil.sendMessage({'name': 'getFile', 'url': url}).then((response) => {
				resolve(response.data);
			});
		});
	},
	getURL: function(filename) {
		return browser.runtime.getURL(filename);
	},
	apiRequest: function(route) {
		return new Promise((resolve, reject) => {
			KaraokeBunnyUtil.sendMessage({'name': 'getFile', 'url': KaraokeBunnyUtil.apiUrl + route}).then((response) => {
				if (!response) {
					console.log('Error getting ' + KaraokeBunnyUtil.apiUrl + route);
					return;
				}
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

    getSongDiv: function(song) {			
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
        duration.appendChild(document.createTextNode(KaraokeBunnyUtil.formatDuration(song.duration)));
        link.appendChild(duration);

        let result = document.createElement("div");
        result.className = 'karaokebunny-song';
        result.appendChild(link);
        return result;
    },

    getQueueDiv: function(queue, currentPosition) {
        let queueDivInner = document.createElement("div");
        queueDivInner.className = 'karaokebunny-queue-inner';

        let totalDuration = 0;
        for (let i=0; i<queue.length; i++) {
            let song = queue[i];
            totalDuration += song.duration;
            
            if (song.position == currentPosition) { // Current song
                $('.karaokebunny-current-title').text(song.title);
                $('.karaokebunny-current-artist').text(song.artist);
                $('.karaokebunny-current-duration').text(KaraokeBunnyUtil.formatDuration(song.duration));
                //$('.karaokebunny-added-by').text('Added by ' + song.added_by);
            }
            //else if (song.position == currentPosition+1) { // Next song
                //$('.karaokebunny-next').text('Next: ' + song.artist + ' — ' + song.title);
            //}
            else if (song.position > currentPosition) {
                queueDivInner.appendChild(KaraokeBunnyUtil.getSongDiv(song));
            }
        }

        let queueTitle = document.createElement("div");
        queueTitle.className = 'karaokebunny-queue-title';

        let upcoming = document.createElement("span");
        upcoming.appendChild(document.createTextNode('Song Queue'));
        queueTitle.appendChild(upcoming);

        let duration = document.createElement("div");
        duration.className = 'karaokebunny-total-duration';
        duration.dataset.duration = totalDuration;
        duration.appendChild(document.createTextNode(KaraokeBunnyUtil.formatDuration(totalDuration)));
        queueTitle.appendChild(duration);

        let queueDiv = document.createElement("div");
        queueDiv.className = 'karaokebunny-queue';
        queueDiv.appendChild(queueTitle);
        queueDiv.appendChild(queueDivInner);

        return queueDiv;
    }
}
