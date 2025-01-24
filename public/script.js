// Set up WebSocket to default namespace /
const socket = io('/');
const videoGrid = document.getElementById('video-grid');

// Creates Peer object to manage RTC connections on port 3001
const myPeer = new Peer(undefined, {
  host: '/',
  port: '3001'
});
const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};
let mediaRecorder;
let recordedChunks = [];

// Requests access to user media
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  //const localVideo = document.getElementById('local-video');
  //localVideo.srcObject = stream;
  //localVideo.play();

  // Initialize MediaRecorder for recording webcam footage
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // Start recording when the stream is ready
  mediaRecorder.start();

  // Listens for incoming calls
  myPeer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  // Initiates call to new users when user-connected event is received
  socket.on('user-connected', userId => {
    connectToNewUser(userId, stream);
  });

  // End call logic
  document.getElementById('end-call').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop(); // Stop recording
    }

    // Save the recorded video
    mediaRecorder.onstop = () => {
      if (recordedChunks.length > 0) {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'webcam-footage.webm';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }

      // Disconnect from the call and redirect to the home page
      socket.disconnect();
      window.location.href = '/';
    };
  });
});

// Removes users from peer list when disconnecting
socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close();
});

// Join-room emitting logic
myPeer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', userVideoStream => {
    addVideoStream(video, userVideoStream);
  });
  call.on('close', () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}
