var context;
var source;
var processor;
var streamLocal;
var webSocket;
var inputArea;
var partialArea;
const bufferSize = 8192;
const sampleRate = 8000;
const wsURL = 'ws://172.25.6.69:2700';
var initComplete = false;
var text = "";

(function () {
    document.addEventListener('DOMContentLoaded', (event) => {
        inputArea = document.getElementById('q');
        partialArea = document.getElementById('q2');

        const listenButton = document.getElementById('listenWithScript');
        const stopListeningButton = document.getElementById('stopListeningWithScript');

        listenButton.addEventListener('mousedown', function () {

            console.log("limin: listenButton.addEventListener mousedown")


            listenButton.disabled = true;

            initWS();
            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate
                }, video: false
            }).then(handleSuccess);
            listenButton.style.color = 'green';
            initComplete = true;
        });

        stopListeningButton.addEventListener('mouseup', function (event) {
            if (initComplete === true) {

                webSocket.send('{"eof" : 1}');
                webSocket.close();

                source.disconnect(processor);
                processor.disconnect(context.destination);
                if (streamLocal.active) {
                    streamLocal.getTracks()[0].stop();
                }
                listenButton.style.color = 'black';
                listenButton.disabled = false;
                initComplete = false;
                inputArea.innerText = ""
            }
        });

        console.log("limin: DOMContentLoaded")
    });
}())


const handleSuccess = function (stream) {
    streamLocal = stream;
    context = new AudioContext({sampleRate: sampleRate});
    source = context.createMediaStreamSource(stream);
    processor = context.createScriptProcessor(bufferSize, 1, 1);

    source.connect(processor);
    processor.connect(context.destination);

    processor.onaudioprocess = function (audioDataChunk) {
        console.log(audioDataChunk.inputBuffer);
        sendAudio(audioDataChunk);
    };
};

function sendAudio(audioDataChunk) {
    if (webSocket.readyState === WebSocket.OPEN) {
        // convert to 16-bit payload
        const inputData = audioDataChunk.inputBuffer.getChannelData(0) || new Float32Array(bufferSize);
        const targetBuffer = new Int16Array(inputData.length);
        for (let index = inputData.length; index > 0; index--) {
            targetBuffer[index] = 32767 * Math.min(1, inputData[index]);
        }
        webSocket.send(targetBuffer.buffer);
    }
}

function initWS() {
    console.log('limin: initWS');

    webSocket = new WebSocket(wsURL);
    webSocket.binaryType = "arraybuffer";

    webSocket.onopen = function (event) {
        console.log('New connection established');
    };

    webSocket.onerror = function (event) {
        console.error(event.data);
    };

    webSocket.onmessage = function (event) {

        console.log(event.data);

        if (event.data) {

            let parsed = JSON.parse(event.data);
            // if (parsed.result) console.log(parsed.result);
            // if (parsed.text) inputArea.innerText = parsed.text;

            if (parsed.partial)
            {
                // inputArea.innerText = parsed.partial;
                partialArea.innerText = parsed.partial;
            }
            else if (parsed.text)
            {
                text += (parsed.text + " ");
                inputArea.innerText = text;
            }
        }
    };
}
