'use strict';

var roomUrl;

$( document ).ready(function() {
    generateRoomUrl();

}); // end of document.ready

/**
 * Generates a random string of length 6. Example: qyvf2x 
 *
 * We need this for the room URL (e.g. http://www.foobubble.com/room/qyvf2x)
 *
 */
function shortUrl() {
    return ("000000" + (Math.random()*Math.pow(36,6) << 0).toString(36)).slice(-6)
}

/**
 * Set the href for the room
 *
 *
 */
function generateRoomUrl() {
    var room = shortUrl();
	var link = document.getElementById("room-url");
	roomUrl =  'https://'+window.location.host+'/'+room;
	link.href = roomUrl;
	link.innerHTML = roomUrl;


	var linkWA = document.getElementById("linkWA");
	let txt = 'You have just been invited to connect to : ';
	linkWA.href = 'https://wa.me/?text=' + $('<div>').text(txt).html()  + roomUrl;


	/*
	var linkFM = document.getElementById("linkFM");
	txt = 'You have just been invited to connect to : ';
	linkFM.href = 'fb-messenger://share/?app_id=672331388004079&link=' + $('<div>').text(txt).html()  + roomUrl;
	*/


	var qrcode = new QRCode("qrcode");
	qrcode.makeCode(roomUrl);
}