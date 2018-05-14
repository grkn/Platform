var express = require('express');
var app = express();
var cors = require('cors');
var mongo = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var FaceBookClass = require('./facebook/facebook');
var SkypeClass = require('./skype/skypeClass');
var MongoQueries = require('./mongo/mongoQueries');
var Client = require('node-rest-client').Client;
var Chatbase = require('./chatbase/chatbase');
const queryString = require('query-string');
var uuid = require('uuid-random');
var CookieSession = require('cookie-session');
var CookieParser = require('cookie-parser');

var path = require('path');
var client = new Client();
var url = 'mongodb://localhost:27017/platform';

let instanceMongoQueries;

let global = {defaultAuthorizationToken : 'DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6', vacationFlag : 0, fullvacationdate : []};

app.use(CookieParser());

app.use(CookieSession({
  name : 'session',
  keys : [uuid(), uuid()],
  maxAge : 365 * 24 * 60 * 60 * 1000
}));

app.use(function (req, res, next) {
    if(!req.cookies.user_id)
      res.cookie('user_id', uuid(), {maxAge : 365 * 24 * 60 * 60 * 1000});
    next();
});

var facebookClass = new FaceBookClass(
  // req.body.facebookDeployment.pageId,
  // req.body.facebookDeployment.appId,
  // req.body.facebookDeployment.appSecret,
  // req.body.facebookDeployment.accessToken,
  // req.body.facebookDeployment.verifyToken, resp[0], instanceMongoQueries,req.headers.authorization.split(" ")[1]
);

mongo.connect(url, function(err, db) {
  if (err) throw err;
  instanceMongoQueries = new MongoQueries(db);
  instanceMongoQueries.find('platform', 'configuration', function(resp){
    console.log(resp);
    if(resp && resp.length > 0){
      global= resp[0];
    }else{
      global = {
        threshold : 0.7,
        responseList : [],
        persistentMenu : [],
        defaultAuthorizationToken : global.defaultAuthorizationToken,
        facebookDeployment : {},
        chatbaseAppSecret : '',
        vacationFlag : 0,
        fullvacationdate : [],
        createdDate : new Date()
      }
      instanceMongoQueries.insertOne('platform', 'configuration', global, function(resp){});
    }
  })
});



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(function (req, res, next){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.use(express.static(path.join(__dirname, 'webchat')));

app.use(express.static(path.join(__dirname, 'lib')));

app.get('/chat_images.png', function(req, res){res.sendFile(__dirname + '/chat_images.png');});

// html i ekrana basıyor
app.get('/', function(req, res){res.sendFile(__dirname + '/MessageDefinitionForIntent.html');});
// Vue için
app.get('/asset/js/messages.js', function(req, res){res.sendFile(__dirname + '/asset/js/messages.js');});
// Vue için
app.get('/asset/js/index.js', function(req, res){res.sendFile(__dirname + '/asset/js/index.js');});

app.get('/mongo/createCollection/:collectionName', function(req, res){
  instanceMongoQueries.createCollection(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.params.collectionName, function(resp, err){
    res.send({resp : 'OK'});
  });
});

app.post('/mongo/insert/:collectionName', function(req, res){
  if(req.body.obj && Array.isArray(req.body.obj)){
    instanceMongoQueries.insertMany(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.params.collectionName, req.body.obj, function(resp, obj){
      res.send(resp);
    });
  }
  if(req.body.obj && !Array.isArray(req.body.obj)){
    instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.params.collectionName, req.body.obj, function(resp, obj){
      res.send(resp);
    });
  }
});

app.get('/mongo/find/:collectionName', function(req, res){
  instanceMongoQueries.find('platform', req.params.collectionName, function(result){
    res.send(result);
  });
});

app.get('/mongo/findByLimitTen/:collectionName', function(req, res){
  instanceMongoQueries.findWithLimit(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.params.collectionName, function(result){
    res.send(result);
  });
});

app.post('/mongo/findByQuery/:collectionName', function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.params.collectionName, req.body.query, function(result){
    res.send(result);
  });
});

app.post('/mongo/findByQueryForMessages', function(req, res){
  instanceMongoQueries.findByQuerySort(global[queryString.parse(req.query()).authorization].defaultAuthorizationToken, 'messages', req.body.query, function(result){
    res.send(result);
  });
});

app.get('/mongo/delete/:collectionName', function(req, res){
  instanceMongoQueries.deleteCollection('platform', req.params.collectionName);
  res.send({resp : 'OK'});
});

app.post('/mongo/post/subjectRelation', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.intent}, function(response){
    if(response.length == 0){
      instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.intent, subject : req.body.subject, createdDate : new Date()}, function(resp){
        res.send({resp : 'OK'});
      });
    }else{
      instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.intent}, {intent: req.body.intent, subject : req.body.subject , updatedDate : new Date()}, function(resp){
        res.send({resp : 'OK'});
      });
    }
  });
});

app.delete('/mongo/delete/subjectRelation', cors(), function(req, res){
    instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.intent, subject : req.body.subject}, function(resp){
        res.send(resp);
    });
});

app.get('/mongo/get/subjects', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {}, function(resp){
    res.send(resp);
  });
});

app.post('/mongo/get/subject', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent :  req.body.intent}, function(resp){
    res.send(resp);
  });
});

app.delete('/mongo/delete/subject', cors(), function(req, res){
  if(req.body.fallback && req.body.fallback.subject){
    instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.fallback.subject}, {$pull :  {'response' : req.body.fallback.selectedResponse}}, function(resp){
      res.send(resp);
    });
  }else{
    instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.subject.toLowerCase()}, function(resp){
      res.send(resp);
    });
    instanceMongoQueries.deleteMany(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {subject : req.body.subject.toLowerCase()}, function(resp){});
  }
});

app.post('/mongo/post/subject', cors(), function(req, res){
  console.log("req.body.fallback : " + req.body.fallback);
  if(req.body.fallback && req.body.fallback.subject){
    instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.fallback.subject.toLowerCase()}, function(resp){
      if(resp.length == 0){
        req.body.fallback.subject = req.body.fallback.subject.toLowerCase();
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.fallback.subject, response : req.body.fallback.response}, function(response){});
      }else{
        req.body.fallback.subject = req.body.fallback.subject.toLowerCase();
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.fallback.subject}, {$push : {response : req.body.fallback.response}}, function(response){});
      }
      res.send({resp : 'OK'});
    });
  }else{
    instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.subject.toLowerCase()}, function(resp){
      if(resp.length == 0){
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject', {subject : req.body.subject.toLowerCase(), createdDate : new Date()}, function(response){});
      }
      res.send({resp : 'OK'});
    });
  }
});

// wit e intent olusturuyor
app.post('/create/intent', cors(), function(req, res){
  var wit = {
    data : {
      'value' : req.body.value,
      'expressions' : []
    },
    headers : {
      'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
      'Content-Type' : 'application/json'
    }
  }
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.value, subject : req.body.subject}, function(resp){});
    res.send(response);
  });
});

// wit den intent i getiriyor
app.get('/get/witai/entities', function(req, res){
  var wit = {
    data : {
      parameters : {}
    },
    headers : {
      'Authorization' : 'Bearer ' +  (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken) ,
      'Content-Type' : 'application/json'
    }
  };
  client.get('https://api.wit.ai/entities/intent', wit, function(response){
    res.send(response);
  });
});

// wit den intent siliyor
app.delete('/delete/intent', cors(), function(req, res){
  var wit = {
    data : {},
    headers : {
      'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
      'Content-Type' : 'application/json'
    }
  }
  client.delete('https://api.wit.ai/entities/intent/values/' + encodeURIComponent(req.body.value), wit, function(response){
    instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'subject_intent_relation', {intent : req.body.value}, function(resp){});
    instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' :  req.body.value}, function(resp){
      res.send({resp : 'OK'});
    });
  });
});

// wit intent e cümle kaydediyor
app.post('/post/intent/expressions', function(req,   res){
  console.log("req.body : " + req.body);
  var wit = {
    data : {
  		value : req.body.value,
  		expressions : req.body.expressions
    },
    headers : {
      'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
      'Content-Type' : 'application/json'
    }
  };
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    res.send(response);
  });
});

// wit intent den cümle siliyor
app.delete('/delete/intent/expressions', function(req, res){
  console.log("req.body.expression : "+ req.body.expression);
	var wit = {
		data : {},
		headers : {
		  'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
		  'Content-Type' : 'application/json'
		}
	}
	client.delete('https://api.wit.ai/entities/intent/values/' + req.body.value + '/expressions/' + encodeURIComponent(req.body.expression), wit, function(response){
		res.send(response);
	});
});

// intent icin cevap ekleme
app.post('/send/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' :  req.body.intent}, function(resp){
    console.log("resp : " + resp);
    if(resp.length > 0){
      instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.message, 'type' : 'text'}}, function(resp){});
    }else{
      instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.message, 'type' : 'text'} , function(resp){});
    }
  });
  res.send({resp : 'OK'});
});

// intent icin cevap getirme
app.get('/get/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' :  queryString.parse(req.query()).intent}, function(resp){
      res.send(resp[0]);
  });
});

// intent icin cevap silme
app.delete('/delete/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' :  queryString.parse(req.query()).intent}, function(resp){
    res.send({resp : 'OK'});
  });
});

//** WEB API for dialogflow**//
app.get('/api/getMessage/dialogFlow', cors(), function(req, res){
  var dialog = {
    data : {
      'lang' : 'en',
      'query' : queryString.parse(req.query()).message,
      'sessionId' : '12345',
      'timezone' : 'Asia/Istanbul'
    },
    headers : {
      'Authorization' : 'Bearer 327778ba5583490284a126400602a3b0',
      'Content-Type' : 'application/json'
    }
  }
  client.post('https://api.dialogflow.com/v1/query?v=20183001', dialog, function(response){
    let text = response.result.fulfillment.speech;
    res.send({resp : text});
  });
});

// WEB API create app
app.post('/witaiCreateApp/post', cors(), function(req, res){
    console.log("req.body.application : " + req.body.application);
    var wit = {
      data : {
        'name' : req.body.application.name,
        'lang' : req.body.application.language,
        'private' : req.body.application.prvt,
        'desc' : req.body.application.description
      },
      headers : {
        'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
        'Content-Type' : 'application/json'
      }
    }
    client.post('https://api.wit.ai/apps', wit, function(response){
        res.send(response);
    });
});

// WEB API for wit.ai
app.post('/api/getMessage/witai/:collectionName', cors(), function(req, res){
  var authorization = queryString.parse(req.query()).authorization;
  console.log("Authorization : " + authorization);
  try{
    var wit = {
      data : {
        parameters : {}
      },
      headers : {
        'Authorization' : 'Bearer ' +  queryString.parse(req.query()).accessToken,
        'Content-Type' : 'application/json'
      }
    };
    //Emoji var mı
    var searchedItem = req.body.obj.message.text.replace(/(<img\s[^>]*?src\s*=\s*['\"]([^'\"]*?)['\"][^>]*?>)/g,"");
    instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'emoji_relation', {'source.text' : searchedItem}, function(resppp){
      if(resppp.length > 0){
        //Emoji var!!
        var msg = {text : resppp[0].target, type : 'emoji'};
        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : resppp[0].source, type : 'emoji'}, 'user_id' : req.cookies.user_id, 'created_date' : new Date()};
        var chatbase = new Chatbase('' + resppp[0].source, req.cookies.user_id, 'user', global, 'emoji');
        chatbase.sendMessage();
        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){
          res.send({text : resppp[0].target, type : 'emoji'});
        });
        obj = {'transaction' : req.body.obj.transaction, 'message' : {text : resppp[0].target, type : 'emoji'}, 'user_id' : req.cookies.user_id + '_BOT', 'created_date' : new Date(obj.created_date.getTime() + 1)};
        var chatbase = new Chatbase('' +  resppp[0].source, req.cookies.user_id, 'agent', global, 'emoji');
        chatbase.sendMessage();
        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
      }else{
        //Emoji yok
        //Subject var mı ?
        if(req.session.subject){
          //Subject varsa
          console.log("Subject var : " + req.session.subject);
          console.log("Wit ai istek atıyor... obj : " + encodeURIComponent(searchedItem));
          client.get('https://api.wit.ai/message?q=' + encodeURIComponent(searchedItem), wit, function(response){
            var subjectLocal = req.session.subject;
            if(req.session.subject[0]){
              subjectLocal = req.session.subject[0].subject;
            }else{
              subjectLocal = req.session.subject.subject;
            }
            if(subjectLocal == "izintarih" && response.entities.day && response.entities.month && response.entities.year){
              console.log("Tarih bilgisi tam ");
              console.log("subjectLocal : " + subjectLocal);
              res.send({text :  'İzin başlangıç tarihiniz ' + response.entities.day[0].value + '.' + response.entities.month[0].value + '.' + response.entities.year[0].value + ' olarak alınmıştır.'});
            }
            else if(response.entities && response.entities.intent && response.entities.intent.length > 0){
                console.log("Subject var Intent varsa.");
                var maxFirst = -1;
                var maxValueFirst = '';
                for(var i = 0; i < response.entities.intent.length; i++){
                  if(maxFirst < response.entities.intent[i].confidence){
                    maxValueFirst = response.entities.intent[i].value;
                    maxFirst = response.entities.intent[i].confidence;
                  }
                }
                if(maxFirst < global.threshold){
                  console.log("maxfirst threshold dan dusuk geldi");
                  var subjectLocal = req.session.subject;
                  if(req.session.subject[0]){
                    subjectLocal = req.session.subject[0].subject;
                  }else{
                    subjectLocal = req.session.subject.subject;
                  }
                    console.log(global.threshold + " Witai maxfirst threshold dan dusuk geldi. ai search with subject  obj : " + encodeURIComponent(subjectLocal + ' ' + searchedItem));
                    client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectLocal + ' ' + searchedItem), wit, function(response){
                        if(response.entities && response.entities.intent && response.entities.intent.length > 0){
                          console.log("Wit ai intent buldu.");
                          maxFirst = -1;
                          maxValueFirst = '';
                          for(var i = 0; i < response.entities.intent.length; i++){
                            if(maxFirst < response.entities.intent[i].confidence){
                              maxValueFirst = response.entities.intent[i].value;
                              maxFirst = response.entities.intent[i].confidence;
                            }
                          }
                          var subjectLocal = req.session.subject;
                          if(req.session.subject[0]){
                            subjectLocal = req.session.subject[0].subject;
                          }else{
                            subjectLocal = req.session.subject.subject;
                          }
                          console.log("SUBJECT LOCAL 1 : " + subjectLocal);
                          if(maxFirst < global.threshold){
                            console.log(global.threshold + " Witai maxFirst threshold dan dusuk geldi. ai search with subject");
                            instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(err, respp){
                              var text = "";
                              if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                                var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                                text = req.session.subject[0].response[random];
                                var chatbase = new Chatbase(text, req.cookies.user_id, 'agent', respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                                chatbase.sendMessage();
                              }else {
                                  if(respp && respp[0]){
                                    var random = Math.floor(Math.random() * (respp[0].responseList.length));
                                    text = respp[0].responseList[random];
                                    var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                                    chatbase.sendMessage();
                                  }
                              }
                              req.body.obj.created_date = new Date();
                              var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                              instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                              instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                              if(respp && respp[0]){
                                var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                                chatbase.sendMessage();
                              }
                              req.body.obj.confidenceLevel = maxFirst;
                              req.body.obj.intentName = maxValueFirst;
                              instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                              console.log("Fallback basıldı");
                              res.send({text : text});
                              return;
                            });
                          }
                          instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
                            console.log(sResponse);
                            if(sResponse.length > 0){
                              console.log("Subject intent relation tablosunda subject var. Subject güncelle");
                              req.session.subject = sResponse[0];
                              instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject', {subject : req.session.subject.subject}, function(r){
                                console.log(r);
                                req.session.subject = r;
                              });
                            }
                          console.log("Answer tablosunda cevap var mı ?");
                          instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'answers', {'key' : maxValueFirst}, function(response){
                            if(response.length > 0){
                                if(req.body.obj){
                                  console.log("Answer tablosunda cevap var");
                                  req.body.obj.created_date = new Date();
                                  req.body.obj.confidenceLevel = maxFirst;
                                  req.body.obj.intentName = maxValueFirst;
                                  instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                                    var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                                    chatbase.sendMessage();
                                    var chatbase = new Chatbase('' + response[0].value, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                                    chatbase.sendMessage();
                                  });
                                  var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                                  console.log("response[0].value : " + response[0].value);
                                  res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ''});
                                  return;
                                }
                              }
                              else{
                                instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                                  console.log("Answer tablosunda cevap yok");
                                  var text = "";
                                  if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                                    var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                                    text = req.session.subject[0].response[random];
                                    var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                                    chatbase.sendMessage();
                                  }else {
                                    var random = Math.floor(Math.random() * (respp[0].responseList.length));
                                    text = respp[0].responseList[random];
                                    var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                                    chatbase.sendMessage();
                                  }
                                  req.body.obj.created_date = new Date();
                                  var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                                  var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                                  chatbase.sendMessage();
                                  console.log("Fallback basıldı");
                                  res.send({text : text});
                                  return;
                                });
                              }
                            });
                          });

                        }else{
                          console.log("Wit ai intent bulamadi.");
                          instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                            var text = "";
                            if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                              var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                              text = req.session.subject[0].response[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                              chatbase.sendMessage();
                            }else {
                              var random = Math.floor(Math.random() * (respp[0].responseList.length));
                              text = resp[0].responseList[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                              chatbase.sendMessage();
                            }
                            req.body.obj.created_date = new Date();
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                            var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                            chatbase.sendMessage();
                            console.log("Fallback basildi.");
                            res.send({text : text});
                            return;
                        });
                      }
                    });
                  return;
                }
                else{
                  console.log("maxfirst threshold dan buyuk geldi");
                  console.log("Find subject. Subject intent relation tablosunda subject var mı ?");
                  instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
                    console.log(sResponse);
                    if(sResponse.length > 0){
                      console.log("Subject intent relation tablosunda subject var. Subject güncelle");
                      req.session.subject = sResponse[0];
                      instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject', {subject : req.session.subject.subject}, function(r){
                        console.log(r);
                        req.session.subject = r;
                      });
                    }
                    console.log("Answer tablosunda cevap var mı ?");
                    instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'answers', {'key' : maxValueFirst}, function(response){
                      if(response.length > 0){
                        console.log("Answer tablosunda cevap var");
                          if(req.body.obj){
                            req.body.obj.created_date = new Date();
                            req.body.obj.confidenceLevel = maxFirst;
                            req.body.obj.intentName = maxValueFirst;
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                            instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                              var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                              chatbase.sendMessage();
                              var chatbase = new Chatbase('' + response[0].value, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                              chatbase.sendMessage();
                            });
                            console.log(response[0].value);
                            res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ''});
                            return;
                          }
                        }else{
                          console.log("Answer tablosunda cevap yok");
                          instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                            var text = "";
                            if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                              var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                              text = req.session.subject[0].response[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                              chatbase.sendMessage();
                            }else {
                              var random = Math.floor(Math.random() * (respp[0].responseList.length));
                              text = respp[0].responseList[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                              chatbase.sendMessage();
                            }
                            req.body.obj.created_date = new Date();
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                            var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id,'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                            chatbase.sendMessage();
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                            res.send({text : text});
                            return;
                        });
                      }
                    });
                  });
                }
            }
            else{
              console.log("Subject var Intent yoksa.");
              console.log(req.session);
              var subjectLocal = req.session.subject;
              if(req.session.subject[0]){
                subjectLocal = req.session.subject[0].subject;
              }else{
                subjectLocal = req.session.subject.subject;
              }
              console.log("Wit ai subject plus content obj : " + encodeURIComponent(subjectLocal + ' ' + searchedItem));
              client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectLocal + ' ' + searchedItem), wit, function(response){
                  if(response.entities && response.entities.intent && response.entities.intent.length > 0){
                    maxFirst = -1;
                    maxValueFirst = '';
                    for(var i = 0; i < response.entities.intent.length; i++){
                      if(maxFirst < response.entities.intent[i].confidence){
                        maxValueFirst = response.entities.intent[i].value;
                        maxFirst = response.entities.intent[i].confidence;
                      }
                    }
                    console.log("Max Confidence : " + maxFirst + " threshold: " + global.threshold);
                    if(maxFirst < global.threshold){
                      instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                        var text = "";
                        if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                          var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                          text = req.session.subject[0].response[random];
                          var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                          chatbase.sendMessage();
                        }else {
                          var random = Math.floor(Math.random() * (respp[0].responseList.length));
                          text = respp[0].responseList[random];
                          var chatbase = new Chatbase(text, req.cookies.user_id, 'agent', global, 'general_fallback', false);
                          chatbase.sendMessage();
                        }
                        req.body.obj.created_date = new Date();
                        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                        var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                        chatbase.sendMessage();
                        req.body.obj.confidenceLevel = maxFirst;
                        req.body.obj.intentName = maxValueFirst;
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                        res.send({text : text});
                        return;
                      });
                    }
                    instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
                      console.log(sResponse);
                      if(sResponse.length > 0){
                        console.log("Subject intent relation tablosunda subject var. Subject güncelle");
                        req.session.subject = sResponse[0];
                        instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject', {subject : req.session.subject.subject}, function(r){
                          console.log(r);
                          req.session.subject = r;
                        });
                      }
                    console.log("Answer tablosunda cevap var mı ?");
                    instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'answers', {'key' : maxValueFirst}, function(response){
                      if(response.length > 0){
                          if(req.body.obj){
                            req.body.obj.created_date = new Date();
                            req.body.obj.confidenceLevel = maxFirst;
                            req.body.obj.intentName = maxValueFirst;
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                            instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                              var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                              chatbase.sendMessage();
                              var chatbase = new Chatbase('' + response[0].value, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                              chatbase.sendMessage();
                            });

                            console.log(response[0].value);
                            res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ''});
                            return;
                          }
                        }else{
                          instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                            var text = "";
                            if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                              var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                              text = req.session.subject[0].response[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                              chatbase.sendMessage();
                            }else {
                              var random = Math.floor(Math.random() * (respp[0].responseList.length));
                              text = respp[0].responseList[random];
                              var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                              chatbase.sendMessage();
                            }
                            req.body.obj.created_date = new Date();
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                            var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                            chatbase.sendMessage();
                            res.send({text : text});
                            return;
                          });
                        }
                    });
                  });
                  }else{
                    instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                      var text = "";
                      if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                        var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                        text = req.session.subject[0].response[random];
                        var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                        chatbase.sendMessage();
                      }else {
                        var random = Math.floor(Math.random() * (respp[0].responseList.length));
                        text = respp[0].responseList[random];
                        var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                        chatbase.sendMessage();
                      }
                      req.body.obj.created_date = new Date();
                      var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                      instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                      instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                      instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                      var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                      chatbase.sendMessage();
                      res.send({text : text});
                      return;
                  });
                }
              });
            }
          });
        }
        else{
          //Subject yoksa
          client.get('https://api.wit.ai/message?q=' + encodeURIComponent(searchedItem), wit, function(response){
            if(response.entities && response.entities.intent && response.entities.intent.length > 0){
              var maxFirst = -1;
              var maxValueFirst = '';
              for(var i = 0; i < response.entities.intent.length; i++){
                if(maxFirst < response.entities.intent[i].confidence){
                  maxValueFirst = response.entities.intent[i].value;
                  maxFirst = response.entities.intent[i].confidence;
                }
              }
              if(maxFirst < global.threshold){
                instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                  var random = Math.floor(Math.random() * (respp[0].responseList.length));
                  var text = respp[0].responseList[random];
                  req.body.obj.created_date = new Date();
                  var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                  chatbase.sendMessage();
                  var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                  req.body.obj.confidenceLevel = maxFirst;
                  req.body.obj.intentName = maxValueFirst;
                  instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                  var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                  chatbase.sendMessage();
                  res.send({text : text});
                  return;
                });
                console.log("maxFirst < global.threshold : " + global.threshold);
              }
              instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
                console.log("sResponse : " + sResponse);
                if(sResponse.length > 0){
                  req.session.subject = sResponse[0];
                  instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'subject', {subject : req.session.subject.subject}, function(r){
                    console.log("r : " + r);
                    req.session.subject = r;
                  });
                }
                instanceMongoQueries.findByQuery(queryString.parse(req.query()).accessToken, 'answers', {'key' : maxValueFirst}, function(response){
                  if(response.length > 0){
                      if(req.body.obj){
                        req.body.obj.created_date = new Date();
                        req.body.obj.confidenceLevel = maxFirst;
                        req.body.obj.intentName = maxValueFirst;
                        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                        instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                          var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                          chatbase.sendMessage();
                          var chatbase = new Chatbase('' + response[0].value, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, maxValueFirst, false);
                          chatbase.sendMessage();
                        });
                        console.log("response[0].value : "+ response[0].value);
                        res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ''});
                        return;
                      }
                    }else{
                      instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                        var text = "";
                        if(req.session.subject && req.session.subject[0] && req.session.subject[0].response){
                          var random = Math.floor(Math.random() * (req.session.subject[0].response.length - 1));
                          text = req.session.subject[0].response[random];
                          var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, req.session.subject[0].subject + '_fallback', false);
                          chatbase.sendMessage();
                        }else {
                          var random = Math.floor(Math.random() * (respp[0].responseList.length));
                          text = respp[0].responseList[random];
                          var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret,'general_fallback', false);
                          chatbase.sendMessage();
                        }
                        req.body.obj.created_date = new Date();
                        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                        instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                        var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                        chatbase.sendMessage();
                        res.send({text : text});
                        return;
                    });
                  }
                });
              });
            }else{
              console.log("global[authorization].defaultAuthorizationToken : " + global[authorization].defaultAuthorizationToken);
              instanceMongoQueries.find(global[authorization].defaultAuthorizationToken, 'configuration', function(respp){
                var random = Math.floor(Math.random() * (respp[0].responseList.length));
                var text = respp[0].responseList[random];
                var chatbase = new Chatbase(text, req.cookies.user_id, 'agent',  respp[0].chatbaseAppSecret, 'general_fallback', false);
                chatbase.sendMessage();
                req.body.obj.created_date = new Date();
                var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id + '_BOT', 'created_date' : new Date(req.body.obj.created_date.getTime() + 1)};
                instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, obj, function(resp, obj){});
                instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, req.params.collectionName, req.body.obj, function(resp, obj){});
                instanceMongoQueries.insertOne(queryString.parse(req.query()).accessToken, 'training_messages', req.body.obj, function(resp, obj){});
                var chatbase = new Chatbase(req.body.obj.message.text, req.cookies.user_id, 'user',  respp[0].chatbaseAppSecret, maxValueFirst, true);
                chatbase.sendMessage();
                res.send({text : text});
                return;
            });
            }
          });
        }
      }
  });
  }catch(err){res.send({resp : err})}
});

app.post('/view/create/carousel', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'carousel', 'updatedDate' : new Date()}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'carousel' , 'createdDate' : new Date()} , function(resp){});
      }
        res.send({resp : 'OK'});
    });
});

app.post('/view/get/carousel', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/quickReply', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.quickReply, 'type' : 'quickReply', 'updatedDate' : new Date()}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.quickReply, 'type' : 'quickReply', 'createdDate' : new Date()}, function(resp){});
      }
      res.send({resp : 'OK'});
    });
});

app.post('/view/get/quickReply', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
    res.send(resp[0]);
  });
});

app.post('/view/get/emoji', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
    res.send(resp[0]);
  });
});

app.get('/mongo/emojiRelation/get', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji_relation', {}, function(resp){
    res.send(resp);
  });
});

app.get('/mongo/emoji/get', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji', {}, function(resp){
    res.send(resp);
  });
});

app.delete('/delete/emoji/relation', cors(), function(req, res){
  instanceMongoQueries.deleteOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji_relation', {'source.text' : req.body.text}, function(resp){
    res.send({resp : 'OK'});
  });
});

app.post('/save/emoji/relation', cors(), function(req, res){
  //req.body.emoji , req.body.intent
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji_relation', {source : req.body.source}, function(resp){
      if(resp.length > 0 ){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji_relation', {source : req.body.source}, {source : req.body.source, target : req.body.target, updatedDate : new Date()}, function(resp){
          res.send(resp);
        });
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'emoji_relation', {source : req.body.source, target : req.body.target, createdDate : new Date()}, function(resp){
          res.send(resp);
        });
      }
  });
});

app.post('/view/create/listTemplate', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.listTemplate, 'type' : 'listTemplate', 'updatedDate' : new Date()}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.listTemplate, 'type' : 'listTemplate', 'createdDate' : new Date()}, function(resp){});
      }
        res.send({resp : 'OK'});
    });
});

app.post('/view/get/listTemplate', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/genericButtons', cors(), function(req, res){
    instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.genericButtons, 'type' : 'genericButtons', 'updatedDate' : new Date()}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.genericButtons, 'type' : 'genericButtons', 'createdDate' : new Date()}, function(resp){});
      }
        res.send({resp : 'OK'});
    });
});

app.post('/view/get/genericButtons', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
    res.send(resp[0]);
  });
});

app.post('/view/create/attachment', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
    if(resp.length > 0){
      instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.attachments, 'type' : 'attachment', 'updatedDate' : new Date()}}, function(resp){});
    }else{
      instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent, 'value' : req.body.attachments, 'type' : 'attachment', 'createdDate' : new Date()}, function(resp){});
    }
      res.send({resp : 'OK'});
  });
});

app.post('/view/get/attachment', cors(), function(req, res){
  instanceMongoQueries.findByQuery(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'answers', {'key' : req.body.intent}, function(resp){
    res.send(resp[0]);
  });
});

// angular facebook deploy get
app.get('/facebook/get', cors(), function (req, res) {
  instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(resp){
    res.send(resp);
  });
});

// angular facebook deploy post
app.post('/facebook/post', cors(), function (req, res) {
  console.log("req.body.facebookDeployment : " + req.body.facebookDeployment);
  instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$set : {facebookDeployment : req.body.facebookDeployment}}, function(err, resp){
    global.facebookDeployment = req.body.facebookDeployment;
  });
  instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(resp){
    facebookClass.setWebhook(req.body.facebookDeployment.guid);
    facebookClass.setVerifyToken(req.body.facebookDeployment.verifyToken);
    facebookClass.setAppSecret(req.body.facebookDeployment.appSecret);
    facebookClass.setToken(req.body.facebookDeployment.accessToken);
    facebookClass.setInstanceMongoQueries(instanceMongoQueries);
    facebookClass.setGlobal(resp[0]);
    facebookClass.setAuthorization(req.headers.authorization.split(" ")[1]);
    res.send({data : 'OK'});
  });
});

app.post('/witaiDeploy/post', cors(), function (req, res) {
  var value = instanceMongoQueries.distinct('platform', 'configuration', req.headers.authorization.split(" ")[1]);
  console.log(value);
  value.then(function(resp){
    if(resp && resp[0]){
      resp[0].defaultAuthorizationToken = req.body.witDeployment;
      global[req.headers.authorization.split(" ")[1]] = resp[0];
      instanceMongoQueries.updateOne('platform', 'configuration', {}, global, function(resp){});
      instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(err, respp){
        console.log("RESPP2 : " + respp);
          if(!respp || !respp[0]){
            instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', global, function(err, respp){});
          }
      });
      res.send({data : req.body.witDeployment});
    }else{
      global[req.headers.authorization.split(" ")[1]] = {
        threshold : 0.7,
        responseList : [],
        persistentMenu : [],
        defaultAuthorizationToken : req.body.witDeployment,
        facebookDeployment : {},
        chatbaseAppSecret : '',
        vacationFlag : 0,
        fullvacationdate : [],
        createdDate : new Date()
      }
      instanceMongoQueries.updateOne('platform', 'configuration', {}, global, function(resp){});
      instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(err, respp){

          if(!respp || !respp[0]){
            instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', global, function(err, respp){});
          }
      });
      res.send({data : req.body.witDeployment});
    }
  });
});

app.get('/witaiDeploy/get', cors(), function (req, res) {
  console.log("req.headers.authorization : " + req.headers.authorization);
  instanceMongoQueries.find('platform', 'configuration', function(resp){
    console.log("resp : " + resp);
    if(resp && resp[0] && resp[0][req.headers.authorization.split(" ")[1]]){
      res.send(resp[0][req.headers.authorization.split(" ")[1]]);
    }else
    res.send(resp[0]);
  });
});

// angular project info deploy get bunları silsek mi? sileyim ama sildikten sonra 5 dfakka mola :Dok
app.post('/witai/delete', function(req, res){
  instanceMongoQueries.deleteFromTrainingMessage(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.body.message, function(resp){
    res.send(resp);
  });
});

app.post('/witai/validate', function(req, res){
  var wit = {
    data : {
  		value : req.body.intent,
  		expressions : [req.body.message]
    },
    headers : {
      'Authorization' : 'Bearer ' + (req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken),
      'Content-Type' : 'application/json'
    }
  };
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    instanceMongoQueries.deleteFromTrainingMessage(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, req.body.message, function(resp){
      res.send(resp);
    });
  });
});

app.get('/change/threshold/:threshold', function(req, res){
  console.log(req.headers.authorization);
  if(req.headers.authorization && global[req.headers.authorization.split(" ")[1]]){
    instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(resp){
      console.log("Bu change threshold icindeki resp[0] : " + resp[0]);
      if(resp && resp[0]){
        instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$set : {'threshold' : req.params.threshold}}, function(err, respp){
          console.log("req.params.threshold : " + req.params.threshold);
          res.send(respp);
        });
      }else{
        instanceMongoQueries.insertOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', global, function(err, respp){
          res.send(respp);
        });
      }
    });
  }else{
    global.threshold = req.params.threshold;
    instanceMongoQueries.updateOne('platform', 'configuration', {}, {$set : {"threshold" : req.params.threshold}}, function(err, resp){
      res.send(resp);
    });
  }
});

app.get('/get/threshold/', function(req, res){
  if(req.headers.authorization && global[req.headers.authorization.split(" ")[1]]){
    instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(resp){
        console.log("Bu get threshold icindeki resp : " + resp);
      res.send(resp);
    });
  }else{
    instanceMongoQueries.find(global[queryString.parse(req.query()).authorization].defaultAuthorizationToken, 'configuration', function(resp){
      res.send(resp);
    });
  }
});

app.get('/add/responseList/:response', function(req, res){
  if(req.headers.authorization && global[req.headers.authorization.split(" ")[1]]){
    global[req.headers.authorization.split(" ")[1]].responseList.push(req.params.response);
    instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$push : {'responseList' :  req.params.response} }, function(err, respp){
      res.send(respp);
    });
  }
});

app.delete('/delete/responseList/:response', function(req, res){
  if(req.headers.authorization && global[req.headers.authorization.split(" ")[1]]){
    global[req.headers.authorization.split(" ")[1]].responseList.push(global[req.headers.authorization.split(" ")[1]].responseList.indexOf(req.params.response),1);
    instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$pull : {'responseList' : req.params.response}}, function(err, respp){
      res.send(respp);
    });
  }
});

app.post('/add/persistentMenu', cors(), function(req, res){
  if(req.headers.authorization && global[req.headers.authorization.split(" ")[1]]){
    instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$set : {'persistentMenu' : req.body.persistentMenuList}}, function(err, respp){
      res.send(respp);
    });
  }
});

app.get('/chatbase/get', cors(), function(req, res){
  instanceMongoQueries.find(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', function(resp){
    res.send(resp);
  });
});

app.post('/chatbase/post', cors(), function(req, res){
  instanceMongoQueries.updateOne(req.headers.authorization && global[req.headers.authorization.split(" ")[1]] ? global[req.headers.authorization.split(" ")[1]].defaultAuthorizationToken : global.defaultAuthorizationToken, 'configuration', {}, {$set : {chatbaseAppSecret : req.body.chatbaseDeployment}}, function(err, resp){
    res.send(resp);
  });
});

facebookClass.botListen();
app.listen(8000);
