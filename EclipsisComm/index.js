
process.title = "EclipsisComm"
var WebSocketServer = require('websocket').server
    ,http = require('http')
    ,clr = require('colors')
    ,serverpasscode = process.env.serverPass; // Passcode in .env

var clients = []
,connections = [];

console.log("TeenzyLab Technologies".rainbow);
console.log("[INFO] This program was created by the Eclipsis+ project team.".blue);
console.log("[INFO] Now starting HTTP server".blue);

var hserver = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(403);
    response.end();
});

hserver.listen(8080, function() {
    console.log("[OK] HTTP server listening on port 8080.".green);
    console.log(("[..] Time --> "+ (new Date())).blue);
});

console.log("[INFO] Binding WS server to HTTP server.".blue);

var wsServer = new WebSocketServer({
    httpServer: hserver,
    autoAcceptConnections: false
});

// Helper functions
function originIsAllowed(origin) {
    // Any origin can connect, but we will ask for a password later.
    return true;
}
function preparemsg(type,req,data) {
    var obj = {msgtype:type,msgreq:req,msgdata:data};
    return JSON.stringify(obj);
}
function chkusername(username) {
    // Havent implemented server verification
    return true;
}
function createuseridentifier(username,time,origin,PIN,connection) {
    var connind = connections.push(connection) - 1;
    var obj = {
        ident:username,
        times:time,
        origincl:origin,
        pass:PIN,
        connindc:connind
    };
    var sout = JSON.stringify(obj);
    return clients.push(sout) - 1;
}
function retrieveconnind(userID) {
    var data = clients[userID];
    data = JSON.parse(data);
    var connind = data.connindc;
    return connind;
}
function retrieveusrind(mode,data0) {
    var data1 = null;
    for (var i = 0;i < clients.length;i++) {
        if (mode == 0) {
            // Username mode
            data1 = clients[i];
            data1 = JSON.parse(data1);
            if (data1.ident == data0) {
                 return i;
            }
        } else if (mode == 1) {
            //Origin mode
            data1 = clients[i];
            data1 = JSON.parse(data1);
            if (data1.origincl == data0) {
                return i;
            }
        }
    }
}
// Connection handler
wsServer.on('request', function(request) {
    // Handler for all different requests sent to server.
    var msgdata
    ,passwait = false
    ,userwait = false
    ,username = false
    ,userPIN = false
    ,userauth = ((userwait && passwait) == false)
    ,userindex = false;
    var connection = request.accept('', request.origin);
    console.log("[INFO] Connection accepted. Details:".blue);
    console.log(("[..] Time --> "+ (new Date())).blue);
    console.log((("[..] Origin --> "+ (request.origin)).blue));
    // Ask for the passcode
    console.log("[SECURITY] Now asking for passcode:".blue);
    passwait = true;
    userwait = true;
    msgdata = preparemsg("sec","1","pass");
    connection.sendUTF(msgdata);
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            var recdata;
            // Password data processing
            if (passwait == true || userwait == true) {
                var secchk = false;
                console.log("[SECURITY] Password recieved! Checking password:".yellow);
                if (passwait == true) {
                    // Check password
                    recdata = JSON.parse(message.utf8Data);
                    var secchk1 = (recdata.msgtype == "sec");
                    var secchk2 = (recdata.msgreq == "0");
                    var secchk3 = (recdata.msgdata == serverpasscode);
                    secchk = (secchk1 && secchk2 && secchk3);
                    if (secchk == true) {
                        userPIN = recdata.msgdata;
                        console.log("[OK] Client entered password correctly".rainbow);
                        connection.sendUTF(preparemsg("sec","0","clr1"));
                        passwait = false;
                        console.log("[SECURITY] Asking client for username".yellow);
                        connection.sendUTF(preparemsg("sec","1","name"));
                    } else {
                        console.log("[ERR] Client entered incorrect password.".red)
                        connection.sendUTF(preparemsg("sec","0","rej"));
                        console.log("[SECURITY] Now asking for passcode:".blue);
                        passwait = true;
                        msgdata = preparemsg("sec","1","pass");
                        connection.sendUTF(msgdata);
                    }
                } else if (userwait == true) {
                    var usrchk = false;
                    recdata = "";
                    // Check username for errors
                    recdata = JSON.parse(message.utf8Data);
                    var usrchk1 = (recdata.msgtype == "sec");
                    var usrchk2 = (recdata.msgreq == "0");
                    var usrchk3 = ((typeof recdata.msgdata) == "string");
                    usrchk = (usrchk1 && usrchk2 && usrchk3);
                    if (usrchk == true && chkusername(recdata.msgdata)) {
                        connection.sendUTF(preparemsg("sec","0","clr2"));
                        username = recdata.msgdata;
                        usrchk == false;
                        userindex = createuseridentifier(username,new Date(),request.origin,userPIN,connection)
                        console.log("[OK] User entered valid credentials and username!".rainbow);
                        console.log("[OK] All details below:".blue);
                        console.log(("[..] Time --> "+ (new Date())).blue);
                        console.log((("[..] Origin --> "+ (request.origin)).blue));
                        console.log(("[..] Username --> "+ username).blue);
                        console.log(("[..] PIN --> "+userPIN).blue);
                        console.log(("[..] Identification Index --> "+userindex).blue);
                        console.log(("[..] Connection Index --> "+retrieveconnind(userindex)).blue)

                    } else {
                        console.log("[SECURITY] User entered invalid username.".red);
                        console.log("[SECURITY] Asking for username again.".yellow);
                        connection.sendUTF(preparemsg("sec","0","rej"));
                        connection.sendUTF(preparemsg("sec","1","name"));
                        usrchk == true;
                    }
                } else {
                    console.log("[ERR] Pass and user checking system is stuck!".red);
                }
            } else if (passwait == false && userwait == false){
                recdata = JSON.parse(message.utf8Data);
                var msgchk1 = (recdata.msgtype == "chtpu");
                var msgchk2 = (recdata.msgreq == "1");
                secchk = (secchk1 && secchk2);
                if (secchk !== true) {
                    connection.sendUTF(preparemsg("sys","0","msgformerr"));
                } else {
                    var msgdta = JSON.parse(recdata.msgdata);
                    if (msgdta.usr == userindex.ident) {
                        var o = JSON.stringify({usr:msgdta.usr,msg:msgdta.msg})
                        for (var i=0; i < clients.length; i++) {
                            var p = clients[i].CI;
                            p.sendUTF(preparemsg("msg","0",o));
                        }
                        connection.sendUTF(preparemsg("sys","0","sendok"))
                    } else {
                        connection.sendUTF(preparemsg("sec","0","errident"));
                    }
                }
            }
        } else {
            console.log("[ERR] You have to send UTF-8 encoded data!".red);
            connection.sendUTF(preparemsg("sys","0","msgformerr"));
        }
    });
    connection.on('close', function(reasonCode, description) {
        var Origin,Username,PIN,II,CI;
        if (userindex !== false) {
            // Remove user identifier from array.
            var dta;
            dta = clients[userindex];
            dta = JSON.parse(dta);
            Username = dta.ident;
            PIN = dta.pass;
            II = userindex;
            CI = dta.connindc;
            clients.splice(userindex, 1);
            connections.splice(dta.CI, 1);
        } else {
            Username = "NOT_ENTERED";
            PIN = "Wot m8";
            II = "NOT_ASSESSED";
            CI = "NOT_ASSESSED";
        }
        Origin = request.origin;
        console.log("[INFO] Client disconnected.".blue);
        console.log("[INFO] All details below:".blue);
        console.log(("[..] Time --> "+ (new Date())).blue);
        console.log((("[..] Origin --> "+ Origin).blue));
        console.log(("[..] Username --> "+ Username).blue);
        console.log(("[..] PIN --> "+PIN).blue);
        console.log(("[..] Identification Index --> "+II).blue);
        console.log(("[..] Connection Index --> "+CI).blue)
    });
});
