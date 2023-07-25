const sampleRate = 8000;
const ws_url = 'ws://172.25.6.69:2700';
var init_complete = false;
var text = "";
var context;
var input_area;
var input_areas;

class Config {
    constructor(name, align) {
        this.name = name;
        this.source;
        this.processor;
        this.stream;
        this.web_socket;
        this.input_area;
        this.align = align;
    }
}

var local_config = new Config("LOCAL", "right");
var remote_config = new Config("REMOTE", "left");

var div_stt;

(function () {
    document.addEventListener('DOMContentLoaded', (event) => {
        local_config.input_area = document.getElementById('stt-local');
        remote_config.input_area = document.getElementById('stt-remote');
        input_area = document.getElementById('stt-all');
        input_areas = [local_config.input_area, remote_config.input_area, input_area];

        div_stt = document.getElementById('stt-div');
        div_stt.style.visibility = 'hidden';

        setInterval(function () {
            input_area.scrollTop = input_area.scrollHeight;
        }, 100);
    });
}())

function start_speech_to_text(remote_stream) {
    if (context) {
        return;
    }

    for (const i of input_areas) {
        i.innerHTML = "";
    }

    div_stt.style.visibility = 'visible';

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
    init_complete = true;
}

function stop_speech_to_text() {
    for (const i of input_areas) {
        i.innerHTML = "";
    }

    div_stt.style.visibility = 'hidden';
    text = "";

    if (init_complete === true) {
        for (const config of [local_config, remote_config]) {
            config.web_socket.send('{"eof" : 1}');
            config.web_socket.close();

            try {
                config.processor.port.close();
                config.source.disconnect(config.processor);
            }
            catch (error) {
                console.error(error);
            }

            if (config.stream.active) {
                config.stream.getTracks()[0].stop();
            }
        }

        context.close();
        context = undefined;
        init_complete = false;
    }
}

const handle_stream = function (config, stream) {
    config.stream = stream;

    context.audioWorklet.addModule('vosk-server/data-conversion-processor.js').then(
        function () {
            config.processor = new AudioWorkletNode(context, 'data-conversion-processor', {
                channelCount: 1,
                numberOfInputs: 1,
                numberOfOutputs: 1
            });

            config.source = context.createMediaStreamSource(stream);
            config.source.connect(config.processor);

            config.processor.connect(context.destination);

            config.processor.port.onmessage = event => {
                if (config.web_socket.readyState == WebSocket.OPEN) {
                    config.web_socket.send(event.data);
                }
            };

            config.processor.port.start();
        }
    );
};

const handle_local_stream = handle_stream.bind(null, local_config);
const handle_remote_stream = handle_stream.bind(null, remote_config);

function init_web_socket(config) {
    config.web_socket = new WebSocket(ws_url);
    config.web_socket.binaryType = "arraybuffer";

    config.web_socket.onopen = function (event) {
        console.log('New connection established');
    };

    config.web_socket.onclose = function (event) {
        console.log("WebSocket closed");
    };

    config.web_socket.onerror = function (event) {
        console.error(event.data);
    };

    config.web_socket.onmessage = function (event) {
        if (event.data) {
            let parsed = JSON.parse(event.data);
            console.log(config.name, parsed);

            if (parsed.partial) {
                config.input_area.innerHTML = parsed.partial;
            }
            else if (parsed.text) {
                // text += (config.name + ": " + parsed.text + "\n");
                text += ('<p align="' + config.align + '">' + parsed.text + "</p>");
                input_area.innerHTML = text;
                config.input_area.innerHTML = parsed.text;
            }
        }
    };
}

const init_local_web_socket = init_web_socket.bind(null, local_config);
const init_remote_web_socket = init_web_socket.bind(null, remote_config);
