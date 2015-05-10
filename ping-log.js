var sys = require("sys");
var path = require("path");
var url = require("url"); 
var fs = require("fs");
var http = require("http");

function cleanUp() {
	var logJson = JSON.parse(fs.readFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",{encoding:"UTF-8"}) + "]}");
	for(var i = 0;i < logJson.logs.length;i++){
				if(logJson.logs[i].t < (new Date().getTime() - 1000*60*60)){
					if(new Date(logJson.logs[i].t).getMinutes() === 0){
						//check if we can find more log-inputs from the same minute, if so, count average 
						for(var j = i + 1; j < 10; j++){
							if(logJson.logs[j]){
								if(logJson.logs[j].t - logJson.logs[i].t < 1000*60*2){
									logJson.logs[i].ping = (logJson.logs[j].ping + logJson.logs[i].ping) / 2;
									logJson.logs.splice(j,1);
									j--;
									continue;
								}
							}
						}

						continue;
					}
					else{
						logJson.logs.splice(i,1);
						i--;
					}
				}
	}
	fs.writeFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",JSON.stringify(logJson).substring(0,JSON.stringify(logJson).length-2));
}
cleanUp();


//once in hour do cleanup in logfile 
setInterval(cleanUp,1000*60*60);

//need to use 'spawn' instead of 'exec' to be able to use streams

function logPing(){
	var spawn = require('child_process').spawn;
	var child = spawn('ping', ['ping.funet.fi', '-n', '-c', '1']);
	
	child.stdout.on('data', function(chunk) {
		chunk = String(chunk);
		if(chunk.match('1 received')) {
			fs.appendFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",
				",{\"t\":"+
				(new Date()).getTime() +
				",\"ping\":" + 
				chunk.split('time=')[1].split(' ')[0]+
				"}");
		}
		else {
			fs.appendFileSync("/home/lauri/nodejs/ping-log/ping-log.txt", 
				",{\"t\":"+
				(new Date()).getTime() + 
				",\"ping\":" +
				"-1"+
				"}");

		//  console.log({"timestamp":(new Date()).getTime(),"ping" : chunk.split('time=')[1].split(' ')[0]});
		}
	});
}

setInterval(logPing,1000*10);

http.createServer(function(request,response){
	
	var my_path = url.parse(request.url).pathname;
	console.log("request.url: "+request.url);
	console.log("my_path: "+my_path); 
	var method = request.method;
	//GET
	if(method === "GET"){
		sys.puts("GET!\nmypath:"+my_path);
		if(my_path.match(/^\/ping\/all$/)){
			response.writeHeader(200, {"Content-Type": "application/json"});
			response.write(fs.readFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",{encoding:"UTF-8"}) + "]}");
			response.end();
			return;
		}
		else if(my_path.match(/^\/ping\/hour$/)){
			
			var logJson = JSON.parse((fs.readFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",{encoding:"UTF-8"}) + "]}"));
			//console.log("%i",logJson.logs);
			for(var i = 0;i < logJson.logs.length;i=i){
				if(logJson.logs[i].t < (new Date().getTime() - 1000*60*60))
					logJson.logs.splice(i,1);
				else //it should have reached the end of too old updates
					break;
			}

			response.writeHeader(200, {"Content-Type": "application/json"});
			response.write(JSON.stringify(logJson));
			response.end();
			return;
		}
		else if(my_path.match(/^\/ping\/week$/)){
			var logJson = JSON.parse((fs.readFileSync("/home/lauri/nodejs/ping-log/ping-log.txt",{encoding:"UTF-8"}) + "]}"));
			for(var i = 0;i < logJson.logs.length;i = i=i){
				if(logJson.logs[i].t < (new Date().getTime() - 1000*60*60*24*7))
					logJson.logs.splice(i,1);
				else //it should have reached the end of too old updates
					break;
			}

			response.writeHeader(200, {"Content-Type": "application/json"});
			response.write(JSON.stringify(logJson));
			response.end();
			return;
		}
		else{
			sys.puts("404");
			response.writeHeader(404, {"Content-Type": "text/plain"});  
			response.write("404 Not Found\n");  
			response.end();
			return;
		}
	
	
	}
	else{
		response.writeHeader(405,"Method not allowed", {"Content-Type": "text/plain"});  
		//response.write("404 Not Found\n");  
		response.end();
	}
	

}).listen(8893);
sys.puts("Server Running on 8893");			
