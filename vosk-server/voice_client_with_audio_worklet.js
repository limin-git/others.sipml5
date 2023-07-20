var context;
var source;
var processor;
var streamLocal;
var local_socket;
var inputArea;
var local_input_area;
const sampleRate = 8000;
const wsURL = 'ws://172.29.65.102:2700';
var initComplete = false;
var text = "";

var remote_source;
var remote_processor;
var remote_stream;
var remote_web_socket;
var remote_input_area;
var all_input_area;
var input_areas;


(function () {
    document.addEventListener('DOMContentLoaded', (event) => {
        local_input_area = document.getElementById('q-local');
        remote_input_area = document.getElementById('q-remote');
        all_input_area = document.getElementById('q-all');
        input_areas = [local_input_area, remote_input_area, all_input_area];

        for (const i of input_areas) {
            i.style.visibility = 'hidden';
        }

        setInterval(function () {
            all_input_area.scrollTop = all_input_area.scrollHeight;
        }, 500);
    });
}())


function on_audio_call_begin(remote_stream) {
    for (const i of input_areas) {
        i.innerHTML = "";
        i.style.visibility = 'visible';
    }

    context = new AudioContext({ sampleRate: sampleRate });
    init_local_web_socket();
    init_remote_web_socket();

    navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate
        }, video: false
    }).then(handle_local_stream)
        .catch((error) => { console.error(error.name || error) });

    handle_remote_stream(remote_stream);

    // listenButton.style.color = 'green';
    initComplete = true;
}


function on_audio_call_end() {
    for (const i of input_areas) {
        i.innerHTML = "";
        i.style.visibility = 'hidden';
    }

    text = "";

    if (initComplete === true) {
        local_socket.send('{"eof" : 1}');
        local_socket.close();

        try {
            processor.port.close();
            source.disconnect(processor);
            // context.close();
        }
        catch (error) {
            console.error(error);
        }

        if (streamLocal.active) {
            streamLocal.getTracks()[0].stop();
        }

        local_socket = null;

        // remote

        remote_web_socket.send('{"eof" : 1}');
        remote_web_socket.close();

        try {
            remote_processor.port.close();
            remote_source.disconnect(remote_processor);
            context.close();
        }
        catch (error) {
            console.error(error);
        }

        if (remote_stream.active) {
            remote_stream.getTracks()[0].stop();
        }

        remote_web_socket = null;
        initComplete = false;
    }
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}


const handle_local_stream = function (stream) {
    streamLocal = stream;

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
                if (local_socket.readyState == WebSocket.OPEN) {
                    local_socket.send(event.data);
                }
            };

            processor.port.start();
        }
    );
};


const handle_remote_stream = function (stream) {
    if (!stream) {
        console.error("stream is null");
        return;
    }

    remote_stream = stream;

    if (!context) {
        context = new AudioContext({ sampleRate: sampleRate });
    }

    context.audioWorklet.addModule('vosk-server/data-conversion-processor.js').then(
        function () {
            remote_processor = new AudioWorkletNode(context, 'data-conversion-processor', {
                channelCount: 1,
                numberOfInputs: 1,
                numberOfOutputs: 1
            });

            remote_source = context.createMediaStreamSource(stream);
            remote_source.connect(remote_processor);

            remote_processor.connect(context.destination);

            remote_processor.port.onmessage = event => {
                if (remote_web_socket.readyState == WebSocket.OPEN) {
                    remote_web_socket.send(event.data);
                }
            };

            remote_processor.port.start();
        }
    );
};


function init_local_web_socket() {
    if (local_socket) {
        return;
    }

    local_socket = new WebSocket(wsURL);
    local_socket.binaryType = "arraybuffer";

    local_socket.onopen = function (event) {
        console.log('New connection established');
    };

    local_socket.onclose = function (event) {
        console.log("WebSocket closed");
    };

    local_socket.onerror = function (event) {
        console.error(event.data);
    };

    local_socket.onmessage = function (event) {
        if (event.data) {
            let parsed = JSON.parse(event.data);
            console.log("LOCAL", parsed);

            if (parsed.partial) {
                local_input_area.innerHTML = "LOCAL: " + parsed.partial;
            }
            else if (parsed.text) {
                text += ("LOCAL : " + parsed.text + "\n");
                all_input_area.innerHTML = text;
            }
        }
    };
}

function init_remote_web_socket() {
    if (remote_web_socket) {
        return;
    }

    remote_web_socket = new WebSocket(wsURL);
    remote_web_socket.binaryType = "arraybuffer";

    remote_web_socket.onopen = function (event) {
        console.log('New remote connection established');
    };

    remote_web_socket.onclose = function (event) {
        console.log("remote WebSocket closed");
    };

    remote_web_socket.onerror = function (event) {
        console.error(event.data);
    };

    remote_web_socket.onmessage = function (event) {
        if (event.data) {
            let parsed = JSON.parse(event.data);
            console.log("REMOTE", parsed);

            if (parsed.partial) {
                remote_input_area.innerHTML = "REMOTE: " + parsed.partial;
            }
            else if (parsed.text) {
                text += ("REMOTE: " + parsed.text + "\n");
                all_input_area.innerHTML = text;
            }
        }
    };
}
