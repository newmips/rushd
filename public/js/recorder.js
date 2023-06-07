/*
*  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
*
*  Use of this source code is governed by a BSD-style license
*  that can be found in the LICENSE file in the root of the source
*  tree.
*/

// This code is adapted from
// https://rawgit.com/Miguelao/demos/master/mediarecorder.html

'use strict';


/* globals MediaRecorder */

let mediaRecorder;
let recordedBlobs = [];
let onAir = false;

const codecPreferences = document.querySelector('#codecPreferences');

const errorMsgElement = document.querySelector('span#errorMsg');
const recordedVideo = document.getElementById('broadcastedVideo');
const recordedCanvas = document.getElementById('broadcastedCanvas');
const recordButton = document.getElementById('record');


recordButton.addEventListener('click', () => {
  if (onAir === false) {
    startRecording();
    onAir = true;
  } else {
    stopRecording();
    onAir = false;
    downloadButton.disabled = false;
  }
});


const downloadButton = document.querySelector('button#download');
/* downloadButton.addEventListener('click', () => {

  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  
          
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.target = '_blank';
  a.download = 'rushd.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);


}); */
downloadButton.addEventListener('click', () => {

  saveAs(new Blob(recordedBlobs, {type: 'video/webm'}), 'rushd.webm');
});


var startTime;
function startRecording() {
  recordedBlobs = [];
  // const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value;
  // const options = {mimeType};

  try {
    const sUsrAg = navigator.userAgent;
    var stream = null;
    
    // const audioContext = new AudioContext();
    // const mediaStreamAudioDestinationNode = new MediaStreamAudioDestinationNode(audioContext);
    // const mediaRecorder = new MediaRecorder(mediaStreamAudioDestinationNode.stream);

    stream = recordedCanvas.captureStream(30);

    let audioId = document.getElementById('selectedAudio').value;
    let elem = null;
    console.log(audioId);
    
    if (audioId == 'localVideo') {
      elem = document.getElementById('localVideo');
    }
    else {
      audioId = "uuid_" + audioId;
      elem = document.getElementById(audioId) ? document.getElementById(audioId).firstChild : document.getElementById('localVideo');
    }


    var audioTrack =  elem.srcObject.getTracks().filter(function(track) {
        return track.kind === 'audio'
    })[0];
    
    stream.addTrack( audioTrack );
    
    mediaRecorder = new MediaRecorder(stream);



  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }
  
  // console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.innerHTML = '<i class="fa fa-square"></i>&nbsp;&nbsp;Stop Recording';
  downloadButton.disabled = true;
  codecPreferences.disabled = true;
  $('.btn-audio').prop('disabled', true);

  mediaRecorder.onstop = function() {

      downloadButton.disabled = false;
      $('.btn-audio').prop('disabled', false);

      var duration = Date.now() - startTime;
      var buggyBlob = new Blob(recordedBlobs, { type: 'video/webm' });

      // v1: callback-style
      console.log(duration);ysFixWebmDuration(buggyBlob, duration, {logger: false})
      .then(function(fixedBlob) {
        recordedBlobs = [];
        recordedBlobs.push(fixedBlob);
      });
          

  };
  mediaRecorder.ondataavailable = function(event) {
      var data = event.data;
      if (data && data.size > 0) {
        recordedBlobs.push(data);
      }
  };
  mediaRecorder.start();
  startTime = Date.now();
}

/*


function handleDataAvailable(event) {
  console.log('handleDataAvailable', event);
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function startRecording() {
  recordedBlobs = [];
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value;
  const options = {mimeType};

  try {
    const sUsrAg = navigator.userAgent;
    var stream = null;
    
    // const audioContext = new AudioContext();
    // const mediaStreamAudioDestinationNode = new MediaStreamAudioDestinationNode(audioContext);
    // const mediaRecorder = new MediaRecorder(mediaStreamAudioDestinationNode.stream);

    stream = recordedCanvas.captureStream(30);

    console.log(document.getElementById('localVideo'));

    var audioTrack =  document.getElementById('localVideo').srcObject.getTracks().filter(function(track) {
        return track.kind === 'audio'
    })[0];
    
    stream.addTrack( audioTrack );
    
    mediaRecorder = new MediaRecorder(stream);



  } catch (e) {
    console.error('Exception while creating MediaRecorder:', e);
    errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
    return;
  }

  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.innerHTML = '<i class="fa fa-square"></i>&nbsp;&nbsp;Stop Recording';
  downloadButton.disabled = true;
  codecPreferences.disabled = true;
  mediaRecorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log('MediaRecorder started', mediaRecorder);

}

*/

function stopRecording() {
  recordButton.innerHTML = '<i class="fa fa-circle"></i>&nbsp;&nbsp;Start Recording';
  /* recordButton.textContent = 'Start Recording'; */
  mediaRecorder.stop();

  document.getElementById('download').setAttribute('enabled', true);
}


/*
async function init(constraints) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleSuccess(stream);
  } catch (e) {
    console.error('navigator.getUserMedia error:', e);
    errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
  }
} */
