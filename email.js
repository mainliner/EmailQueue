var settings = require("./settings.js");
var fs = require('fs');
var pushLogfile = fs.createWriteStream('push.log',{flags:'a'});
var nodemailer = require("nodemailer");

var _log = function(msg) {
    console.log(msg);
};

var amqp = require('amqp');

var connection = amqp.createConnection({ host: settings.rabbitmq,
					 port: settings.rabbitmqPort,
					 login: settings.rabbitmqUser,
					 password: settings.rabbitmqPassword});

connection.on('ready',function(){
    console.log('connect to the Email Queue');
    connection.exchange(settings.exchange, {type: 'direct',autoDelete: false,confirm: true}, function(exchange){
        connection.queue(settings.queue, {exclusive: false}, function(queue){
            queue.bind(settings.exchange, settings.routingKey);
            queue.subscribe(function(msg){
                var encoded_payload = unescape(msg.data);
                var payload = JSON.parse(encoded_payload); //JSON dict
                var email = payload.email;
                var sid = payload.sid;
                sendEmail(email, sid, function(err) {
                    if (err) {
                        var meta = '['+ new Date() +']' + email + '\t' + sid + '\n';  
                        pushLogfile.write(meta + err +'\n');
                    }
                });
            });
        });
    });
});

var sendEmail = function(email, sid, callback){
    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth:{
            user: "xxxx@gmail.com",
            pass: "xxxx"
        }
    });

    var url= "http://192.168.199.238:3000/reset?sid="+encodeURIComponent(sid)+"&email="+email; //use URI encoude to fix the bug
    console.log(url);
    var mailOptions = {
        from: "WeDate",
        to: email,
        subject: "Password Service",
        html: "<h3>Please click the link below to renew you password in 10 mins</h3> <a>"+url+"</a>"
    };
    smtpTransport.sendMail(mailOptions,function(err,res){
        smtpTransport.close();
        if(err){
            return callback(err);
        }else{
            return callback(null);
        }
    });
};
