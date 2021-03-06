var Client = require('node-rest-client').Client;
var client = new Client();

var chatbase = class Chatbase {
  constructor(message, user_id, type, secret, intent, handled){
    this.message = message;
    this.user_id = user_id;
    this.type = type;
    this.intent = intent;
    this.handled = handled;
    this.secret = secret;
    this.body = {
      data : {
        "api_key" : secret,
        "type" : this.type,
        "platform" : "chatbotpanel",
        "message" : this.message,
        "intent": this.intent,
        "version" : "1.0.0",
        "user_id" : this.user_id,
        "not_handled" : this.handled
      },
      headers : {
        'Content-Type' : 'application/json'
      }
    }
  }

  sendMessage(){
    if(this.secret){
      client.post('https://chatbase-area120.appspot.com/api/message', this.body, function(response){
        console.log(response);
      });
    }
  }
}

module.exports = chatbase;
