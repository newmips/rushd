/**
 * This module serves as the router to the different views. It handles
 * any incoming requests.
 *
 * @param app An express object that handles our requests/responses
 * @param socketIoServer The host address of this server to be injected in the views for the socketio communication
 */
 
'use strict';
const ts = require("ts-ebml");
const multer = require("multer");
const upload = multer();
const FileReader = require('filereader')

var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false })


module.exports=function(app, socketIoServer) {

    app.get('/',function(req,res){
        res.render('home');
    });
    
    app.get('/:path',function(req,res){
        var path = req.params.path;
        console.log(path);
		console.log("Requested room "+path);
        res.render('room', {"hostAddress":socketIoServer});  
    });

    app.post('/concat', urlencodedParser, function(req,res) {
 
        console.log("/concat", req.params);
        console.log("/concat", req.query);
        console.log("/concat", req.body);

        console.log(req);

        let url = req.body.url;

        console.log(url);
        const reader = new FileReader();
        reader.readAsDataURL(url);

        /* ------------- Fusion blob -------- */
        /*const readAsArrayBuffer = function(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onloadend = () => { resolve(reader.result); };
                reader.onerror = (ev) => { reject(ev.error); };
            });
        }

        function injectMetadata(blob) {
            const decoder = new ts.Decoder();
            const reader = new ts.Reader();
            reader.logging = false;
            reader.drop_default_duration = false;

            readAsArrayBuffer(blob).then((buffer) => {
                const elms = decoder.decode(buffer);
                elms.forEach((elm) => { reader.read(elm); });
                reader.stop();

                var refinedMetadataBuf = tools.makeMetadataSeekable(
                    reader.metadatas, reader.duration, reader.cues);
                var body = buffer.slice(reader.metadataSize);

                const result = new Blob([refinedMetadataBuf, body],
                    {type: blob.type});

                return result;
            });
        }

        res.send(injectMetadata(blob)).end(); */


    });
    
}