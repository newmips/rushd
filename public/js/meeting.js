'use strict';

var Meeting = function (socketioHost) { 
    var exports = {};
    
    var _isInitiator = false;
    var _localStream;
    var _remoteStream;
    var _turnReady;
    // var _pcConfig = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
    var _pcConfig = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
    /*var _pcConfig = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'},
				{
				  'urls': 'turn:192.168.1.21:3478?transport=udp',
				  'credential': 'p',
				  'username':  'u'
				} ]}; */

    // var _constraints = {video: true, audio:true};
    var _constraints = {
        video: {
            width: { min: 640, ideal: 1920 },
            height: { min: 400, ideal: 1080 },
            aspectRatio: 16/9,
            facingMode: { ideal: "environment" }
        },
        audio: {
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: false,
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1.0
        }
    };
    var _defaultChannel;
    var _privateAnswerChannel;
    var _offerChannels = {};
    var _opc = {};
    var _apc = {};
    var _sendChannel = {};
    var _room;
    var _myID;
    var _onRemoteVideoCallback;
    var _onLocalVideoCallback;
    var _onChatMessageCallback;
    var _onChatReadyCallback;
    var _onChatNotReadyCallback;
    var _onParticipantHangupCallback;
    var _host = socketioHost;
    
    ////////////////////////////////////////////////
    // PUBLIC FUNCTIONS
    ////////////////////////////////////////////////
 	 /**
	 *
	 * Add callback function to be called when a chat message is available.
	 *
	 * @param name of the room to join
	 */   
    function joinRoom(name) {
        _room = name;
        
        _myID = generateID();
        console.log('Generated ID: '+_myID);
        
        // Open up a default communication channel
        initDefaultChannel();

        // Recorder without mic
        // alert(_isInitiator);
        // if (!_isInitiator) {
//            _constraints.audio = false;
   //     }

        if (_room !== '') {
            console.log('Create or join room', _room);
            _defaultChannel.emit('create or join', {room:_room, from:_myID});
        }

        // Open up a private communication channel
        initPrivateChannel();


        // Get local media data
        navigator.mediaDevices.getUserMedia(_constraints).then( function(stream) {
            handleUserMedia(stream);
        }).catch(function(err) {
            handleUserMediaError(err);
            console.log("Unable to get video stream: " + err);
        });

        window.onbeforeunload = function(e){
            _defaultChannel.emit('message',{type: 'bye', from:_myID});
        }
    }
    
    
    /**
	 *
	 * Send a chat message to all channels.
	 *
	 * @param message String message to be send
	 */
    function sendChatMessage(message) {
	    console.log("Sending "+message)
        for (var channel in _sendChannel) {
	        if (_sendChannel.hasOwnProperty(channel)) {
		        _sendChannel[channel].send(message);
		    }
        }
    }
    
    /**
	 *
	 * Toggle microphone availability.
	 *
	 */
    function toggleMic() {
		var tracks = _localStream.getTracks();
		for (var i = 0; i < tracks.length; i++) {
			if (tracks[i].kind=="audio") {
				tracks[i].enabled = !tracks[i].enabled;	
			}
		}
	}
    

    function selectAudio(id, elem) {

        document.getElementById('selectedAudio').value = id;

        $('.btn-audio').removeClass('btn-audio-active');
        elem.classList.add('btn-audio-active');
    }

    function selectVideo(id) {

        let elem = null;
        if (id == 'localVideo') {
            elem = document.querySelector("#" + id);
        }
        else {
            elem = document.querySelector("#uuid_" + id).firstChild;
        }

        let stream;
        const fps = 0;

        if (elem.captureStream) {
            stream = elem.captureStream(fps);
        } else if (elem.mozCaptureStream) {
            stream = elem.mozCaptureStream(fps);
        } else {
            // console.error('Stream capture is not supported');
            // stream = null;

            elem.autoplay = true;

            // const canvas = document.createElement('canvas');
            const canvas = document.getElementById('broadcastedCanvas')
            const ctx = canvas.getContext('2d');
            elem.addEventListener('play', () => {
                function step() {
                ctx.drawImage(elem, 0, 0, canvas.width, canvas.height);
                window.requestAnimationFrame(step);
                }
                window.requestAnimationFrame(step);
            })
            document.body.appendChild(canvas);

            stream = canvas.captureStream(fps);
            console.log(stream);
            
        }
        // document.querySelector('#broadcastedVideo').srcObject = stream;
        handleSuccess(stream);
    }


    function handleSuccess(stream) {
        recordButton.disabled = false;
        console.log('getUserMedia() got stream:', stream);
        window.stream = stream;
      
        const gumVideo = document.getElementById('broadcastedVideo');
        console.log(navigator.userAgent);
        try { 
            if (navigator.userAgent == 'safari') throw ""; 
            gumVideo.srcObject = stream; 
        } catch (error) { 
            gumVideo.src = URL.createObjectURL(data); 
        } 
        gumVideo.play();
      
        getSupportedMimeTypes().forEach(mimeType => {
      
          const option = document.createElement('option');
          option.value = mimeType;
          option.innerText = option.value;
          codecPreferences.appendChild(option);
        });
        codecPreferences.disabled = false;
    }
    
    function getSupportedMimeTypes() {
      const possibleTypes = [
        'video/webm;codecs=av1,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/mp4;codecs=h264,aac',
      ];
      return possibleTypes.filter(mimeType => {
        return MediaRecorder.isTypeSupported(mimeType);
      });
    }
    

    /**
	 *
	 * Toggle video availability.
	 *
	 */
    function toggleVideo() {
		var tracks = _localStream.getTracks();
		for (var i = 0; i < tracks.length; i++) {
			if (tracks[i].kind=="video") {
				tracks[i].enabled = !tracks[i].enabled;	
			}
		}
	}
	
	/**
	 *
	 * Add callback function to be called when remote video is available.
	 *
	 * @param callback of type function(stream, participantID)
	 */
    function onRemoteVideo(callback) {
        _onRemoteVideoCallback = callback;
    }
    
	/**
	 *
	 * Add callback function to be called when local video is available.
	 *
	 * @param callback function of type function(stream)
	 */
    function onLocalVideo(callback) {
        _onLocalVideoCallback = callback;
    }
    
    /**
	 *
	 * Add callback function to be called when chat is available.
	 *
	 * @parama callback function of type function()
	 */
    function onChatReady(callback) {
	    _onChatReadyCallback = callback;
    }
    
    /**
	 *
	 * Add callback function to be called when chat is no more available.
	 *
	 * @parama callback function of type function()
	 */
    function onChatNotReady(callback) {
	    _onChatNotReadyCallback = callback;
    }
    
    /**
	 *
	 * Add callback function to be called when a chat message is available.
	 *
	 * @parama callback function of type function(message)
	 */
    function onChatMessage(callback) {
        _onChatMessageCallback = callback;
    }
    
    /**
	 *
	 * Add callback function to be called when a a participant left the conference.
	 *
	 * @parama callback function of type function(participantID)
	 */
    function onParticipantHangup(callback) {
	    _onParticipantHangupCallback = callback;
    }
    
    ////////////////////////////////////////////////
    // INIT FUNCTIONS
    ////////////////////////////////////////////////
    
    function initDefaultChannel() {
        _defaultChannel = openSignalingChannel('');
        
        _defaultChannel.on('created', function (room){
          console.log('Created room ' + room);
          _isInitiator = true;
        });

        _defaultChannel.on('join', function (room){
            console.log('Another peer made a request to join room ' + room);
        });

        _defaultChannel.on('joined', function (room){
            console.log('This peer has joined room ' + room);
        });
        
        _defaultChannel.on('message', function (message){
            console.log('Client received message:', message);
            if (message.type === 'newparticipant') {
                var partID = message.from;
                
                // Open a new communication channel to the new participant
                _offerChannels[partID] = openSignalingChannel(partID);

                // Wait for answers (to offers) from the new participant
                _offerChannels[partID].on('message', function (msg){
                    if (msg.dest===_myID) {
                        if (msg.type === 'answer') {
                            _opc[msg.from].setRemoteDescription(new RTCSessionDescription(msg.snDescription),
                           setRemoteDescriptionSuccess, 
                           setRemoteDescriptionError);
                        } else if (msg.type === 'candidate') {
                            var candidate = new RTCIceCandidate({sdpMLineIndex: msg.label, candidate: msg.candidate});
                            console.log('got ice candidate from '+msg.from);
                            _opc[msg.from].addIceCandidate(candidate, addIceCandidateSuccess, addIceCandidateError);
                        }
                    }
                });

                // Send an offer to the new participant
                createOffer(partID);

            } else if (message.type === 'bye') {
                hangup(message.from);
            }
        });
    }
      
    function initPrivateChannel() {
        // Open a private channel (namespace = _myID) to receive offers
        _privateAnswerChannel = openSignalingChannel(_myID);

        // Wait for offers or ice candidates
        _privateAnswerChannel.on('message', function (message){
            if (message.dest===_myID) {
                if(message.type === 'offer') {
                    var to = message.from;
                    createAnswer(message, _privateAnswerChannel, to);
                } else if (message.type === 'candidate') {
                    var candidate = new RTCIceCandidate({sdpMLineIndex: message.label, candidate: message.candidate});
                    _apc[message.from].addIceCandidate(candidate, addIceCandidateSuccess, addIceCandidateError);
                }
            }
        });
    }
    
    function requestTurn(turn_url) {
        var turnExists = false;
        for (var i in _pcConfig.iceServers) {
            if (_pcConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
                turnExists = true;
                _turnReady = true;
                break;
            }
        }

        if (!turnExists) {
            console.log('Getting TURN server from ', turn_url);
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (xhr.readyState === 4 && xhr.status === 200) {
                    var turnServer = JSON.parse(xhr.responseText);
                     console.log('Got TURN server: ', turnServer);
                    _pcConfig.iceServers.push({
                        'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
                        'credential': turnServer.password
                    });
                    _turnReady = true;
                }
            }
            xhr.open('GET', turn_url, true);
            xhr.send();
        }
    }

    
    ///////////////////////////////////////////
    // UTIL FUNCTIONS
    ///////////////////////////////////////////
    
    /**
	 *
	 * Call the registered _onRemoteVideoCallback
	 *
	 */
    function addRemoteVideo(stream, from) {
        // call the callback
        _onRemoteVideoCallback(stream, from);
    }

    function countParticipants() {
        return counterParticipants;
    }


    /**
	 *
	 * Generates a random ID.
	 *
	 * @return a random ID
	 */
    function generateID() {
        var s4 = function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        };
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        // return s4() + s4()  + s4()   + s4() +   s4()  + s4() + s4() + s4();
    }

    
    ////////////////////////////////////////////////
    // COMMUNICATION FUNCTIONS
    ////////////////////////////////////////////////
    
    /**
	 *
	 * Connect to the server and open a signal channel using channel as the channel's name.
	 *
	 * @return the socket
	 */
    function openSignalingChannel(channel) {
        var namespace = _host + '/' + channel;
        var sckt = io.connect(namespace,{secure: true});
        return sckt;
    }

    /**
	 *
	 * Send an offer to peer with id participantId
	 *
	 * @param participantId the participant's unique ID we want to send an offer
	 */
    function createOffer(participantId) {
        console.log('Creating offer for peer '+participantId);
        _opc[participantId] = new RTCPeerConnection(_pcConfig);
        _opc[participantId].onicecandidate = handleIceCandidateAnswerWrapper(_offerChannels[participantId], participantId);
        
        // _opc[participantId].onaddstream = handleRemoteStreamAdded(participantId);
        // _opc[participantId].ontrack = handleRemoteStreamAdded(participantId);

        if (_opc[participantId].addStream !== undefined) {
            _opc[participantId].onremovestream = handleRemoteStreamRemoved; 
            _opc[participantId].onaddstream = handleRemoteStreamAdded(participantId);
            _opc[participantId].addStream(_localStream);
        } else {
            _opc[participantId].onremovetrack = handleRemoteStreamRemoved; 
            _opc[participantId].ontrack = handleRemoteStreamAdded(participantId);
            _localStream.getTracks().forEach((track) => {
                _opc[participantId].addTrack(track, _localStream);
            });
        }

        

		try {
			// Reliable Data Channels not yet supported in Chrome
			_sendChannel[participantId] = _opc[participantId].createDataChannel("sendDataChannel", {reliable: false});
			_sendChannel[participantId].onmessage = handleMessage;
			console.log('Created send data channel');
		} catch (e) {
			alert('Failed to create data channel. ' + 'You need Chrome M25 or later with RtpDataChannel enabled');
			console.log('createDataChannel() failed with exception: ' + e.message);
		}
		_sendChannel[participantId].onopen = handleSendChannelStateChange(participantId);
		_sendChannel[participantId].onclose = handleSendChannelStateChange(participantId);

        var onSuccess = function(participantId) {
            return function(sessionDescription) {
                var channel = _offerChannels[participantId];

                // Set Opus as the preferred codec in SDP if Opus is present.
                sessionDescription.sdp = preferOpus(sessionDescription.sdp);

                _opc[participantId].setLocalDescription(sessionDescription, setLocalDescriptionSuccess, setLocalDescriptionError);  
                console.log('Sending offer to channel '+ channel.name);
                channel.emit('message', {snDescription: sessionDescription, from:_myID, type:'offer', dest:participantId});        
            }
        }

        _opc[participantId].createOffer(onSuccess(participantId), handleCreateOfferError);
    }

    function createAnswer(sdp, cnl, to) {
        console.log('Creating answer for peer '+to);
        _apc[to] = new RTCPeerConnection(_pcConfig);
        _apc[to].onicecandidate = handleIceCandidateAnswerWrapper(cnl, to);
        
        // _apc[to].onaddstream = handleRemoteStreamAdded(to);
        // _apc[to].ontrack = handleRemoteStreamAdded(to);
        if (_apc[to].addStream !== undefined) {
            _apc[to].onaddstream = handleRemoteStreamAdded(to);
            _apc[to].onremovestream = handleRemoteStreamRemoved;
            _apc[to].addStream(_localStream);
        } else {
            _apc[to].ontrack = handleRemoteStreamAdded(to);
            _apc[to].onremovetrack = handleRemoteStreamRemoved; 
            _localStream.getTracks().forEach((track) => {
                _apc[to].addTrack(track, _localStream);
            });
        }
          
        

        // _apc[to].addStream(_localStream);
        

        _apc[to].setRemoteDescription(new RTCSessionDescription(sdp.snDescription), setRemoteDescriptionSuccess, setRemoteDescriptionError);

		_apc[to].ondatachannel = gotReceiveChannel(to);
		
        var onSuccess = function(channel) {
            return function(sessionDescription) {
                // Set Opus as the preferred codec in SDP if Opus is present.
                sessionDescription.sdp = preferOpus(sessionDescription.sdp);

                // https://stackoverflow.com/questions/46063374/is-it-really-possible-for-webrtc-to-stream-high-quality-audio-without-noise
                // 'useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000'
                // sessionDescription.sdp = sessionDescription.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000');

                _apc[to].setLocalDescription(sessionDescription, setLocalDescriptionSuccess, setLocalDescriptionError); 
                console.log('Sending answer to channel '+ channel.name);
                channel.emit('message', {snDescription:sessionDescription, from:_myID,  type:'answer', dest:to});
            }
        }

        _apc[to].createAnswer(onSuccess(cnl), handleCreateAnswerError);
    }

    function hangup(from) {
        console.log('Bye received from '+ from);

			if (_opc.hasOwnProperty(from)) {
            	_opc[from].close();
				_opc[from] = null;	
			}
            
            if (_apc.hasOwnProperty(from)) {
            	_apc[from].close();
				_apc[from] = null;
            }

			_onParticipantHangupCallback(from);
    }


    ////////////////////////////////////////////////
    // HANDLERS
    ////////////////////////////////////////////////
    
    // SUCCESS HANDLERS

    function handleUserMedia(stream) {
        console.log('Adding local stream');

        _onLocalVideoCallback(stream);
        _localStream = stream;
        _defaultChannel.emit('message', {type:'newparticipant', from: _myID});
    }

    function handleRemoteStreamRemoved(event) {
        console.log('Remote stream removed. Event: ', event);
    }

    function handleRemoteStreamAdded(from) {
	    return function(event) {
        	console.log('Remote stream added');
			addRemoteVideo(event.stream, from);
			_remoteStream = event.stream;
        }
    }

    function handleIceCandidateAnswerWrapper(channel, to) {
        return function handleIceCandidate(event) {
            console.log('handleIceCandidate event');
            if (event.candidate) {
                channel.emit('message',
                        {type: 'candidate',
                        label: event.candidate.sdpMLineIndex,
                        id: event.candidate.sdpMid,
                        candidate: event.candidate.candidate,
                        from: _myID, 
                        dest:to}
                    );

            } else {
                console.log('End of candidates.');
            }
        }
    }

    function setLocalDescriptionSuccess() {}

    function setRemoteDescriptionSuccess() {}

    function addIceCandidateSuccess() {}

	function gotReceiveChannel(id) {
		return function(event) {
		  	console.log('Receive Channel Callback');
		  	_sendChannel[id] = event.channel;
		  	_sendChannel[id].onmessage = handleMessage;
		  	_sendChannel[id].onopen = handleReceiveChannelStateChange(id);
		  	_sendChannel[id].onclose = handleReceiveChannelStateChange(id);
	  	}
	}
	
	function handleMessage(event) {
	  	console.log('Received message: ' + event.data);
	  	_onChatMessageCallback(event.data);
	}
	
	function handleSendChannelStateChange(participantId) {
		return function() {
		  	var readyState = _sendChannel[participantId].readyState;
		  	console.log('Send channel state is: ' + readyState);
		  	
		  	// check if we have at least one open channel before we set hat ready to false.
		  	var open = checkIfOpenChannel();
		  	enableMessageInterface(open);
	  	}
	}
	
	function handleReceiveChannelStateChange(participantId) {
		return function() {
		  	var readyState = _sendChannel[participantId].readyState;
		  	console.log('Receive channel state is: ' + readyState);
		  	
		  	// check if we have at least one open channel before we set hat ready to false.
		  	var open = checkIfOpenChannel();
		  	enableMessageInterface(open);
	  	}
	}
	
	function checkIfOpenChannel() {
		var open = false;
	  	for (var channel in _sendChannel) {
	        if (_sendChannel.hasOwnProperty(channel)) {
		        open = (_sendChannel[channel].readyState == "open");
		        if (open == true) {
			        break;
		        }
		    }
        }
        
        return open;
	}
	
	function enableMessageInterface(shouldEnable) {
	    if (shouldEnable) {
			_onChatReadyCallback();
	  	} else {
	    	_onChatNotReadyCallback();
	  	}
	}
    
    // ERROR HANDLERS
    
    function handleCreateOfferError(event){
        console.log('createOffer() error: ', event);
    }

    function handleCreateAnswerError(event){
        console.log('createAnswer() error: ', event);
    }

    function handleUserMediaError(error){
        console.log('getUserMedia error: ', error);
    }

    function setLocalDescriptionError(error) {
        console.log('setLocalDescription error: ', error);
    }

    function setRemoteDescriptionError(error) {
        console.log('setRemoteDescription error: ', error);
    }

    function addIceCandidateError(error) {}
    
    
    ////////////////////////////////////////////////
    // CODEC
    ////////////////////////////////////////////////

    // Set Opus as the default audio codec if it's present.
    function preferOpus(sdp) {
      var sdpLines = sdp.split('\r\n');
      var mLineIndex;
      // Search for m line.
      for (var i = 0; i < sdpLines.length; i++) {
          if (sdpLines[i].search('m=audio') !== -1) {
            mLineIndex = i;
            break;
          }
      }
      if (mLineIndex === null || mLineIndex === undefined) {
        return sdp;
      }

      // If Opus is available, set it as the default in m line.
      for (i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('opus/48000') !== -1) {
          var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
          if (opusPayload) {
            sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
          }
          break;
        }
      }

      // Remove CN in m line and sdp.
      sdpLines = removeCN(sdpLines, mLineIndex);

      sdp = sdpLines.join('\r\n');
      return sdp;
    }

    function extractSdp(sdpLine, pattern) {
      var result = sdpLine.match(pattern);
      return result && result.length === 2 ? result[1] : null;
    }

    // Set the selected codec to the first in m line.
    function setDefaultCodec(mLine, payload) {
      var elements = mLine.split(' ');
      var newLine = [];
      var index = 0;
      for (var i = 0; i < elements.length; i++) {
        if (index === 3) { // Format of media starts from the fourth.
          newLine[index++] = payload; // Put target payload to the first.
        }
        if (elements[i] !== payload) {
          newLine[index++] = elements[i];
        }
      }
      return newLine.join(' ');
    }

    // Strip CN from sdp before CN constraints is ready.
    function removeCN(sdpLines, mLineIndex) {
      var mLineElements = sdpLines[mLineIndex].split(' ');
      // Scan from end for the convenience of removing an item.
      for (var i = sdpLines.length-1; i >= 0; i--) {
        var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
        if (payload) {
          var cnPos = mLineElements.indexOf(payload);
          if (cnPos !== -1) {
            // Remove CN payload from m line.
            mLineElements.splice(cnPos, 1);
          }
          // Remove CN line in sdp
          sdpLines.splice(i, 1);
        }
      }

      sdpLines[mLineIndex] = mLineElements.join(' ');
      return sdpLines;
    }
    

    ////////////////////////////////////////////////
    // EXPORT PUBLIC FUNCTIONS
    ////////////////////////////////////////////////
    
    exports.joinRoom            =       joinRoom;
    exports.countParticipants    =      countParticipants;
    exports.toggleMic 			= 		toggleMic;
    exports.selectVideo			= 		selectVideo;
    exports.selectAudio         =       selectAudio;
    exports.toggleVideo			= 		toggleVideo;
    exports.onLocalVideo        =       onLocalVideo;
    exports.onRemoteVideo       =       onRemoteVideo;
    exports.onChatReady 		= 		onChatReady;
    exports.onChatNotReady 		= 		onChatNotReady;
    exports.onChatMessage       =       onChatMessage;
    exports.sendChatMessage     =       sendChatMessage;
    exports.onParticipantHangup =		onParticipantHangup;
    return exports;
    
};
