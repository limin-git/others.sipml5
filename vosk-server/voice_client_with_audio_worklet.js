var context;
var source;
var processor;
var streamLocal;
var webSocket;
var inputArea;
var partialArea;
const sampleRate = 8000;
const wsURL = 'ws://172.25.6.69:2700';
var initComplete = false;
var text = "";

var remote_stream;
var remote_web_socket;
var remote_input_area;
var remote_partial_area;
var remote_text = "";


(function () {
    document.addEventListener('DOMContentLoaded', (event) => {
        inputArea = document.getElementById('q');
        partialArea = document.getElementById('q2');

        remote_input_area = document.getElementById('q-remote');
        remote_partial_area = document.getElementById('q2-remote');

        const listenButton = document.getElementById('listen');
        const stopListeningButton = document.getElementById('stopListening');

        listenButton.addEventListener('mousedown', function () {
            listenButton.disabled = true;
            inputArea.innerText = "";
            partialArea.innerText = "";
            remote_input_area.innerText = "";
            remote_partial_area.innerText = "";

            initWebSocket();
            init_remote_web_socket();

            navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate
                }, video: false
            }).then(handleSuccess)
                .catch((error) => { console.error(error.name || error) });

            listenButton.style.color = 'green';
            initComplete = true;
        });

        stopListeningButton.addEventListener('mouseup', function () {
            listenButton.disabled = false;
            listenButton.style.color = 'black';

            if (initComplete === true) {

                webSocket.send('{"eof" : 1}');
                webSocket.close();

                try {
                    processor.port.close();
                    source.disconnect(processor);
                    context.close();
                }
                catch (error) {
                    console.error(error);
                }

                if (streamLocal.active) {
                    streamLocal.getTracks()[0].stop();
                }

                initComplete = false;
            }
        });

    });
}())


function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}


const handleSuccess = function (stream) {
    streamLocal = stream;

    context = new AudioContext({ sampleRate: sampleRate });

    context.audioWorklet.addModule('vosk-server/data-conversion-processor.js').then(
        function () {
            processor = new AudioWorkletNode(context, 'data-conversion-processor', {
                channelCount: 1,
                numberOfInputs: 1,
                numberOfOutputs: 1
            });

            source = context.createMediaStreamSource(stream);
            source.connect(processor);

            processor.connect(context.destination);

            processor.port.onmessage = event => {
                if (webSocket.readyState == WebSocket.OPEN) {
                    webSocket.send(event.data);
                }
            };

            processor.port.start();
        }
    );
};


const handle_remote = function (stream) {

    remote_stream = stream;

    // context = new AudioContext({ sampleRate: sampleRate });

    context.audioWorklet.addModule('vosk-server/remote-data-conversion-processor.js').then(
        function () {
            processor = new AudioWorkletNode(context, 'remote-data-conversion-processor', {
                channelCount: 1,
                numberOfInputs: 1,
                numberOfOutputs: 1
            });

            source = context.createMediaStreamSource(stream);
            source.connect(processor);

            processor.connect(context.destination);

            processor.port.onmessage = event => {
                if (remote_web_socket.readyState == WebSocket.OPEN) {
                    remote_web_socket.send(event.data);
                }
            };

            processor.port.start();
        }
    );
};


function initWebSocket() {
    webSocket = new WebSocket(wsURL);
    webSocket.binaryType = "arraybuffer";

    webSocket.onopen = function (event) {
        console.log('New connection established');
    };

    webSocket.onclose = function (event) {
        console.log("WebSocket closed");
    };

    webSocket.onerror = function (event) {
        console.error(event.data);
    };

    webSocket.onmessage = function (event) {
        if (event.data) {
            let parsed = JSON.parse(event.data);
            console.log(parsed);
            // if (parsed.result) console.log(parsed.result);
            // if (parsed.text) inputArea.innerText = parsed.text;

            if (parsed.partial) {
                // inputArea.innerText = parsed.partial;
                partialArea.innerText = parsed.partial;
            }
            else if (parsed.text) {
                text += (parsed.text + " ");
                inputArea.innerText = text;
            }
        }
    };
}

function init_remote_web_socket() {
    remote_web_socket = new WebSocket(wsURL);
    remote_web_socket.binaryType = "arraybuffer";

    remote_web_socket.onopen = function (event) {
        console.log('New connection established');
    };

    remote_web_socket.onclose = function (event) {
        console.log("WebSocket closed");
    };

    remote_web_socket.onerror = function (event) {
        console.error(event.data);
    };

    remote_web_socket.onmessage = function (event) {
        if (event.data) {
            let parsed = JSON.parse(event.data);
            console.log(parsed);
            // if (parsed.result) console.log(parsed.result);
            // if (parsed.text) inputArea.innerText = parsed.text;

            if (parsed.partial) {
                // inputArea.innerText = parsed.partial;
                remote_partial_area.innerText = parsed.partial;
            }
            else if (parsed.text) {
                text += (parsed.text + " ");
                remote_input_area.innerText = text;
            }
        }
    };
}
