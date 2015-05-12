var sys = require("sys");
var path = require("path");
var url = require("url"); 
var fs = require("fs");
var http = require("http");
var readline = require('readline');




//first run in folder?
try{
	//this should throw ENOENT if logfile doesn't exist
	cleanUp();
	//once in hour do cleanup in logfile 
	setInterval(cleanUp,1000*60*60);

	setInterval(logPing,1000*10);

	http.createServer(ownHttpServer).listen(8893);
	sys.puts("Server Running on 8893");	
}
catch(e){
	//file did not exist
	if(String(e).match("ENOENT")){
		var rl = readline.createInterface({
		  input: process.stdin,
		  output: process.stdout
		});

		rl.question("Log file: 'ping-log.json' was not found in folder."+
				" Press 'y' to create it and continue?\n", 
			function(answer) {
				
				if(answer !== "y"){
					process.exit(1);
				}
				
				rl.close();
				fs.writeFileSync("ping-log.json",'{"logs":[{"t":'+new Date().getTime()+',"ping":-1}');
				
				//once in hour do cleanup in logfile 
				setInterval(cleanUp,1000*60*60);

				setInterval(logPing,1000*10);
			
				http.createServer(ownHttpServer).listen(8893);
				sys.puts("Server Running on 8893");	
			}
		);
		

	}
}


//oh wow this function looks horrible
// <- me after a year of making this
//this should be cleaning the logfile, because we won't need 
//the frequency of 10s from old measurements, rather just one measurement per hour
function cleanUp() {
	var logJson = JSON.parse(fs.readFileSync("ping-log.json",{encoding:"UTF-8"}) + "]}");
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
	fs.writeFileSync("ping-log.json",JSON.stringify(logJson).substring(0,JSON.stringify(logJson).length-2));
}





//need to use 'spawn' instead of 'exec' to be able to use streams

function logPing(){
	var spawn = require('child_process').spawn;
	var child = spawn('ping', ['ping.funet.fi', '-n', '-c', '1']);
	
	child.stdout.on('data', function(chunk) {
		chunk = String(chunk);
		if(chunk.match('1 received')) {
			fs.appendFileSync("ping-log.json",
				",{\"t\":"+
				(new Date()).getTime() +
				",\"ping\":" + 
				chunk.split('time=')[1].split(' ')[0]+
				"}");
		}
		else {
			fs.appendFileSync("ping-log.json", 
				",{\"t\":"+
				(new Date()).getTime() + 
				",\"ping\":" +
				"-1"+
				"}");

		
		}
	});
}





function ownHttpServer(request,response){
	
	var my_path = url.parse(request.url).pathname;
	//console.log("request.url: "+request.url);
	//console.log("my_path: "+my_path); 
	var method = request.method;
	//GET
	if(method === "GET"){
		//sys.puts("GET!\nmypath:"+my_path);
		if(my_path.match(/^\/ping\/all$/)){
			response.writeHeader(200, {"Content-Type": "application/json"});
			response.write(fs.readFileSync("ping-log.json",{encoding:"UTF-8"}) + "]}");
			response.end();
			return;
		}
		else if(my_path.match(/^\/ping\/hour$/)){
			
			var logJson = JSON.parse((fs.readFileSync("ping-log.json",{encoding:"UTF-8"}) + "]}"));
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
			var logJson = JSON.parse((fs.readFileSync("ping-log.json",{encoding:"UTF-8"}) + "]}"));
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
	

}		
