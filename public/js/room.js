'use strict';

var meeting;
var host = HOST_ADDRESS; // HOST_ADDRESS gets injected into room.ejs from the server side when it is rendered



$( document ).ready(function() {

	let orientation = screen.orientation ? screen.orientation.type : "";
	
	console.log(orientation);

	// IOS
	if (orientation === "") {
			
		console.log(window.innerHeight);
		if (window.innerHeight > window.innerWidth)
			orientation = "portrait";
		else
			orientation = "landscape";
	}

	console.log(orientation);

	switch (orientation) {
		case "landscape-primary":
		case "landscape":
		console.log("That looks good.");
		break;
		case "landscape-secondary":
		console.log("Mmmh… the screen is upside down!");
		break;
		case "portrait-secondary":
		case "portrait-primary":
		case "portrait":
		console.log("Mmmh… you should rotate your device to landscape");
		break;
		default:
		console.log("The orientation API isn't supported in this browser :(");
	}
	

	/////////////////////////////////
	// CREATE MEETING
	/////////////////////////////////
	meeting = new Meeting(host);

	console.log(host);
	console.log(meeting);
	
	meeting.onLocalVideo(function(stream) {
	        //alert(stream.getVideoTracks().length);
	        // document.querySelector('#localVideo').src = window.URL.createObjectURL(stream);
			document.querySelector('#localVideo').srcObject = stream;
			
			// Select local stream by default
			selectVideo('localVideo');

	        $("#micMenu").on("click",function callback(e) {
				toggleMic();
    		});
    		
    		$("#videoMenu").on("click",function callback(e) {
				toggleVideo();
    		});

			$("#localVideo").prop('muted', true);

	    }
	);
	
	meeting.onRemoteVideo(function(stream, participantID) {
	        addRemoteVideo(stream, participantID);  
	    }
	);
	
	meeting.onParticipantHangup(function(participantID) {
			// Someone just left the meeting. Remove the participants video
			removeRemoteVideo(participantID);
		}
	);
    
    meeting.onChatReady(function() {
			console.log("Chat is ready");
	    }
	);

	meeting.onChatNotReady(function() {
		console.log("Chat is not yet ready");
		}
	);
	
    var room = window.location.pathname.match(/([^\/]*)\/*$/)[1];
	meeting.joinRoom(room);

}); // end of document.ready
 

function addRemoteVideo(stream, participantID) {

	console.log('addRemoteVideo');
    var $videoBox = $(`<div class="row mt-4"><div class="col-12"><div class='videoWrap' id='uuid_`+participantID+`'><video onclick="selectVideo('`+participantID+`');" class="videoBox" autoplay="true" playsinline="true" muted="true"></video><button onclick="selectVideo('`+participantID+`');" class="btn btn-outline-secondary mt-2"><i class="fa-solid fa-camera"></i></button>&nbsp;&nbsp;<button onclick="selectAudio('`+participantID+`', this);" class="btn btn-outline-secondary mt-2 btn-audio"><i class="fa-solid fa-microphone"></i></button></div></div></div>`);
    // var $video = $(``);
    
	// $video.attr({"src": window.URL.createObjectURL(stream), "autoplay": "autoplay"});
	// $video.attr({ "autoplay": "autoplay"});
	// $video.attr({"srcObject":  stream, "autoplay": "autoplay"});
	// $video.srcObject = stream;

    // $videoBox.append($video);
	$("#videosWrapper").append($videoBox);

	// var rr = document.querySelector('#'+participantID); 
	// rr.srcObject = stream;
	// $video.attr('src', stream);
	// $video.attr({"src":  stream, "autoplay": "autoplay"});
	// $('#'+participantID+" video").src=stream;
	// $('#'+participantID +" video" ).css("background-color", "red");
	// $('#'+participantID +" video" ).attr('src', stream);
	
	
	// while(document.getElementById('#'+participantID) == null) {
		// console.log('waiting.............');
	// }
	
	var v=document.getElementById("uuid_" + participantID).querySelectorAll(".videoBox");
	console.log(v);
	if(v.length>0){
		v[0].srcObject = stream;
	}
	// window.document.querySelector('#'+participantID +" video").srcObject = stream;
	// window.document.querySelector('#'+participantID +" video").
	// a(participantID).then(b.bind(participantID,stream));
}

var a = function(participantID) {
   	while($('#uuid_'+participantID).length == 0) {
		console.log('waiting.............');
	}
	
	 var defer = $.Deferred();

    console.log('a() called');

    setTimeout(function() {
        defer.resolve(); // When this fires, the code in a().then(/..../); is executed.
    }, 5000);

    return defer;
	
};

var b = function(participantID,stream) {
    window.document.querySelector('#uuid_'+participantID +" video").srcObject = stream;
	
};

function selectVideo(id) {
	meeting.selectVideo(id);
}

function selectAudio(id, elem) {
	meeting.selectAudio(id, elem);
}


 
function removeRemoteVideo(participantID) {
	$("#uuid_"+participantID).remove();
}



var canvas = document.getElementById('broadcastedCanvas');
var ctx    = canvas.getContext('2d');
var video  = document.getElementById('broadcastedVideo');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

video.addEventListener('play', function () {
    var $this = this; //cache

	canvas.width = 1280;
	canvas.height = 720;

    (function loop() {
        if (!$this.paused && !$this.ended) {

			ctx.drawImage($this, 0, 0, 1280, 720);
            setTimeout(loop, 1000 / 30); // drawing at 30fps
        }
    })();
}, 0);
