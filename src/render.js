const { ipcRenderer } = require("electron");
const remote = require("@electron/remote");
const { Menu, dialog } = remote;
const { writeFile } = require("fs");

// buttons
const videoElement = document.querySelector("video");
videoElement.style.display = "none";

const noVideoElement = document.getElementById("noVideo");
noVideoElement.style.display = "flex";

const videoContainer = document.getElementById("videoContainer");
videoContainer.onclick = getVideoSources;
const videoSelectBtn = document.getElementById("videoSelectBtn");
videoSelectBtn.onclick = getVideoSources;

const startBtn = document.getElementById("startBtn");
startBtn.setAttribute("disabled", true);
startBtn.onclick = (e) => {
  mediaRecorder.start();
  videoElement.classList.add("border-4", "border-red-500");
  startBtn.innerText = "Recording";
  startBtn.setAttribute("disabled", true);
};

const stopBtn = document.getElementById("stopBtn");
stopBtn.setAttribute("disabled", true);
stopBtn.onclick = (e) => {
  mediaRecorder.stop();
  videoElement.classList.remove("border-4", "border-red-500");
  startBtn.removeAttribute("disabled");
  startBtn.innerText = "Start";
};

// get the desktopCapturer.getSources from the main process
const desktopCapturer = {
  getSources: (opts) =>
    ipcRenderer.invoke("DESKTOP_CAPTURER_GET_SOURCES", opts),
};

// get video sources
async function getVideoSources() {
  // get all the video sources with the type of window and screen
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"],
  });

  // create a menu of video sources
  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map((source) => {
      return {
        label: source.name,
        click: () => selectSource(source),
      };
    })
  );

  videoOptionsMenu.popup();
}

let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  };

  // create a stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // create the Media Recorder
  const options = { mimeType: "video/webm; codecs=vp9" };
  mediaRecorder = new MediaRecorder(stream, options);

  videoElement.style.display = "block";
  noVideoElement.style.display = "none";
  startBtn.removeAttribute("disabled");
  stopBtn.removeAttribute("disabled");

  // register event handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log("video data available");
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: recordedChunks[0].type,
  });

  // create buffer from blob, then convert it to mp4 file using webm-to-mp4
  const buffer = Buffer.from(await blob.arrayBuffer());

  // save the file using dialog
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: "Save video",
    defaultPath: `screen-recorder-${Date.now()}.mp4`,
  });

  console.log(filePath);

  writeFile(filePath, mp4, () => console.log("video saved successfully!"));
}
