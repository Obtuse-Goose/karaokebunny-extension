if (typeof chrome !== 'undefined') {var browser = chrome;}

let KaraokeBunny = {
    connect: function() {
        persistentPort = browser.runtime.connect({name: 'karaokebunny'});
        persistentPort.onDisconnect.addListener(KaraokeBunny.connect);
        
        persistentPort.onMessage.addListener(msg => {
            KaraokeBunny.loadQueue(msg.message.roomCode, msg.message.queue, msg.message.currentPosition);
        });
    },

    loadQueue: function(roomCode, queue, currentPosition) {
        console.log(queue);
        if (JSON.stringify(KaraokeBunny.queue) == JSON.stringify(queue)) {
            return;
        }
        
        if (!KaraokeBunny.qrCode) {
            KaraokeBunny.qrCode = new QRCode(document.getElementById("karaokebunny-qrcode"), "https://app.karaokebunny.com/#Search/" + roomCode);
        }

        $('.karaokebunny-queue').replaceWith(KaraokeBunnyUtil.getQueueDiv(queue, currentPosition));

        KaraokeBunny.queue = queue;
    }

};

$(document).ready(function() {
    let newBody = document.createElement("body");
    newBody.className = 'karaokebunny-popped';
    newBody.appendChild(KaraokeBunnyUtil.getSidebarDiv());
    $('body').replaceWith(newBody);

    KaraokeBunny.connect();
});


