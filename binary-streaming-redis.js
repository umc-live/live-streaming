var express = require('express');
var server = express();
var BinaryServer = require('binaryjs').BinaryServer;
var redis = require("redis");
var fs = require("fs");
var path = require('path');
var Channel = require('./channel');
require('./hash');

var videoServer = new BinaryServer({server: server, path: '/video-server', port:4705});
var redisCli = redis.createClient();

var SERVER_PORT = 8080;

function getChannelNameFromUrl(url){
  return url.split('?')[1].split('=')[1];
}

server.get('/getwebm/:channel/last-id/:resolution',function(req,res){
  var baseKey = req.params.channel.toString().hashCode();
  redisCli.get(baseKey+"_"+req.params.resolution, function(err, reply) {
    res.status(200).send(reply);
  });

});

//GET VIDEO FROM BROWSER AND PUBLISH TO REDIS
videoServer.on('connection', function(client){
  var channel;
  client.on('stream', function(stream, channelName) {
    channel = new Channel(channelName);
    stream.on("data",function(chunk){
      channel.stream(chunk);
    });
  });
  client.on('close', function (){
    channel.close();
  });
});

server.get('/getwebm/:channel/:id',function(req,res){
    var channelName = req.params.channel.toString().hashCode();
    var id = req.params.id;
    var tms = id.split("_")[0];
    var resolution = id.split("_")[1];
    redisCli.get(channelName+"_"+resolution, function(err, last_from_channel) {
      if (parseInt(last_from_channel) <= parseInt(tms)){
        res.status(404).send('greater');
      }else {
        var file_path = "content/"+channelName;
        var file_name = id+".webm";
        fs.stat(file_path+"/"+file_name, function(err, stat) {
            if(err != null && err.code == 'ENOENT') {
                res.status(404).send('Not found');
            } else if(err != null) {
                console.error('Some other error: ', err.code);
            } else{
              var filePath = path.join(file_path,file_name);
              var stat = fs.statSync(filePath);

              res.writeHead(200, {
                  'Content-Type': 'video/webm',
                  'Content-Length': stat.size,
                  'Access-Control-Allow-Origin':'*',
                  'Access-Control-Allow-Credentials':true
              });
              var readStream = fs.createReadStream(filePath);
              readStream.pipe(res);  
            }
            
        });
      }
    });    
});  

server.get('/getChannels',function(req,res){
    redisCli.smembers("allchannels", function(err, reply) {
      if (reply == null){
        res.status(404).send("");
      }else{
        res.status(200).send(reply);  
      }
    });
});

server.get('/recorder',function(req,res){
    res.sendFile(__dirname + '/views/recorder.html');
});

server.get('/mock',function(req,res){
    res.sendFile(__dirname + '/views/mock.html');
});

server.get('/styles.css',function(req,res){
    res.sendFile(__dirname + '/static/css/styles.css');
});

server.get('/rediscope.png',function(req,res){
    res.sendFile(__dirname + '/static/img/rediscope.png');
});

server.get('/recorder.js',function(req,res){
    res.sendFile(__dirname + '/static/js/recorder.js');
});

server.get('/index.js',function(req,res){
    res.sendFile(__dirname + '/static/js/index.js');
});

server.get('/video.js',function(req,res){
    res.sendFile(__dirname + '/static/js/video.js');
});

server.get('/get-stream.js',function(req,res){
    res.sendFile(__dirname + '/static/js/get-stream.js');
});

server.get('/bitrate.js',function(req,res){
    res.sendFile(__dirname + '/static/js/bitrate.js');
});

server.get('/modernizr.min.js',function(req,res){
    res.sendFile(__dirname + '/static/js/modernizr.min.js');
});

server.get('/jquery.min.js',function(req,res){
    res.sendFile(__dirname + '/static/js/jquery.min.js');
});

server.get('/binary.min.js',function(req,res){
    res.sendFile(__dirname + '/static/js/binary.min.js');
});

server.get('/video',function(req,res){
    res.sendFile(__dirname + '/views/video.html');
});

server.get('/',function(req,res){
    res.sendFile(__dirname + '/views/index.html');
});

server.get('/create',function(req,res){
    res.sendFile(__dirname + '/views/create.html');
});

server.listen(SERVER_PORT);