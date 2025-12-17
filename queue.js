if (typeof chrome !== 'undefined') {var browser = chrome;}

let KaraokeBunny = {
    connect: function() {
        KaraokeBunny.backgroundPort = browser.runtime.connect({name: 'karaokebunny-queue-popup'});
        KaraokeBunny.backgroundPort.onDisconnect.addListener(KaraokeBunny.connect);
        
        KaraokeBunny.backgroundPort.onMessage.addListener(msg => {
            KaraokeBunny.loadQueue(msg.message.roomCode, msg.message.queue, msg.message.currentPosition);
        });
    },

    loadQueue: function(roomCode, queue, currentPosition) {
        //console.log(queue);
        if (JSON.stringify(KaraokeBunny.queue) == JSON.stringify(queue)) {
            return;
        }
        
        if (!KaraokeBunny.qrCode) {
            KaraokeBunny.qrCode = new QRCode(document.getElementById("karaokebunny-qrcode"), "https://app.karaokebunny.com/#Search/" + roomCode);
        }

        $('.karaokebunny-queue').replaceWith(KaraokeBunnyUtil.getQueueDiv(queue, currentPosition));

        KaraokeBunny.queue = queue;
    },

    unpopClick: function() {
       window.close();
    }

};

$(document).ready(function() {
    let newBody = document.createElement("body");
    newBody.className = 'karaokebunny-popped';

    let popoutButton = document.createElement("button");
    popoutButton.className = 'karaokebunny-button karaokebunny-popout-button';
    popoutButton.title = 'Unpop Song Queue';
    let popoutImage = document.createElement("img");
    popoutImage.src = KaraokeBunnyUtil.getURL('img/unpop.png');
    popoutImage.className = 'karaokebunny-button-image karaokebunny-button-popout';
    popoutButton.appendChild(popoutImage);
    $(popoutButton).on("click", KaraokeBunny.unpopClick);

    let header = document.createElement("div");
    header.className = "karaokebunny-header";

    header.appendChild(popoutButton);
    newBody.appendChild(header);
    newBody.appendChild(KaraokeBunnyUtil.getSidebarDiv());

    $('body').replaceWith(newBody);

    KaraokeBunny.connect();
});


