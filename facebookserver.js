var express = require('express');
var cors = require('cors');
var firebase = require('firebase');
var bodyParser = require('body-parser');
var MessengerPlatform = require('facebook-bot-messenger');

var app = require('express')();
var server = require('http').Server(app);

var bot = MessengerPlatform.create({
  pageID: '462408217458374',
  appID: '1554280444644659',
  appSecret: '10b645dc19f5a1cf8d9f3a4f161cd66b',
  pageToken: 'EAACVxbP9YJQBABd7KaQGWmspFwJdOX1nAZCZCthIhDlZB1Xpg88G3BatozEJlpUS1uqF6MIOWyE8KAZB5KD5ZAICrpjVUqxS9khDvwXPyLgKh4hYCkygFZBQZARjTIqzPIktwFTyZBYseauVQRPhEdW3DHI4C8MmGMZA6iAB5ID4WRwZDZD',
  validationToken: 'secretkey',
  endpointVersion : 'v2.11'
}, server);

// var bot = MessengerPlatform.create({
//   pageID: '1657653330994017',
//   appID: '164676360822932',
//   appSecret: '3852884e6f04de03bfbaf79757811b40',
//   pageToken: 'EAACVxbP9YJQBABvkrAhnnqpQjV5yxU8YDbrJkxJyIqhNkHFzevhwRygCdbU3Vi5huHt7NqopVb5eGJR8LjIRoqcHdVatm6ijgihAYJrYZAkKqSENCwhBoaYvIJEnqL5BaDGUoIJx9YBd0Nift1VtmoOdXF7AhWs38a4j4WQZDZD',
//   validationToken: 'secretkey'
// }, server);

app.use(bot.webhook('/webhook'));
bot.on('message', function(userId, message) {
  console.log(message +" "+userId);
  console.log(message["recipient"]);
  var textMessageBuilder = new MessengerPlatform.TextMessageBuilder('Hello World');
    this.sendMessage("1365984016813390",textMessageBuilder).then(function(){
      done();
  });
});



bot.on('sendMessage',function(userId, textMessageBuilder){
  console.log("Hello");
});

bot.getProfile('<user id>').then(function(data) {
  console.log(data);
}).catch(function(error) {
  // add your code when error.
});
/*

bot.on('message', function(userId, message) {
  console.log(message +" "+userId);
});






bot.on('message', (payload, reply) => {
  let text = payload.message.text

  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err

    reply({ text }, (err) => {
      if (err) throw err

      console.log(`Echoed back to ${profile.first_name} ${profile.last_name}: ${text}`)
    })
  })
})*/

server.listen(8082);
