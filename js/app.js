URL = window.URL || window.webkitURL;

let gumStream; 						
let rec; 							
let input; 							

let AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext

let recordButton = document.getElementById("recordButton");
let stopButton = document.getElementById("stopButton");

const silentThreshold = 15
let refreshIntervalId;

recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);

function startRecording() {
    
    const constraints = { audio: true, video:false }

	recordButton.disabled = true;
	stopButton.disabled = false;

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {

		audioContext = new AudioContext();

		// update the format 
		document.getElementById("formats").innerHTML="Format: 1 channel pcm @ "+audioContext.sampleRate/1000+"kHz"


		gumStream = stream;
		
		// use the stream
		input = audioContext.createMediaStreamSource(stream);

        const analyser = audioContext.createAnalyser();
        input.connect(analyser);
        analyser.fftSize = 1024;

		// Create the Recorder object and configure to record mono sound (1 channel)
	    // Recording 2 channels  will double the file size
		recorder = new Recorder(input,{numChannels:1})

		// start the recording process
        refreshIntervalId = setInterval(() => {
            let array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
        
            let values = 0;        
            let length = array.length;
        
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
        
            let average = values / length;
        
            if (average > silentThreshold) {
                recorder.record();
            } else {
                recorder.stop();
            }
        }, 400);

		console.log("Recording started");

	}).catch(function(err) {
    	recordButton.disabled = false;
    	stopButton.disabled = true;
	});
}

function stopRecording() {
    console.log("Recording stopped");

	stopButton.disabled = true;
	recordButton.disabled = false;
	
    // tell the recorder to stop the recording
    clearInterval(refreshIntervalId);
	recorder.stop();

	// stop microphone access
	gumStream.getAudioTracks()[0].stop();

	// create the wav blob and pass it on to createDownloadLink
	recorder.exportWAV(createDownloadLink);
}

function createDownloadLink(blob) {
	
	const url = URL.createObjectURL(blob);
	const au = document.createElement('audio');
	const li = document.createElement('li');
	const link = document.createElement('a');

	const filename = new Date().toISOString();

	// add controls to the <audio> element
	au.controls = true;
	au.src = url;

	// save to disk link
	link.href = url;
	link.download = filename+".wav";
	link.innerHTML = "Save to disk";

	li.appendChild(au);
	li.appendChild(document.createTextNode(filename+".wav "))
	li.appendChild(link);

	recordingsList.appendChild(li);
}