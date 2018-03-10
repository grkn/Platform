var express = require('express');
var app = express();
var cors = require('cors');
var mongo = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
var FaceBookClass = require('./facebook/facebook');
var MongoQueries = require('./mongo/mongoQueries');
var SkypeClass = require('./skype/skypeClass');
var Client = require('node-rest-client').Client;
var Carousel = require('./views/carousel');
const queryString = require('query-string');
var uuid = require('uuid-random');
var cookieSession = require('cookie-session');
var cookieParser = require('cookie-parser');
var path = require('path');
var client = new Client();


var url = 'mongodb://localhost:27017/platform';
let instanceMongoQueries;

let global = { }
app.use(cookieParser())

app.use(cookieSession({
  name: 'session',
  keys: [uuid(),uuid()],

  // Cookie Options
  maxAge: 365 * 24 * 60 * 60 * 1000
}))


app.use(function (req, res, next) {
    if(!req.cookies.user_id)
      res.cookie('user_id',uuid(),{maxAge :365 * 24 * 60 * 60 * 1000})
    next();
});

mongo.connect(url, function(err, db) {
  if (err) throw err;
  instanceMongoQueries = new MongoQueries(db);
  instanceMongoQueries.find('configuration', function(resp){
    console.log(resp);
    if(resp && resp.length > 0){
      global = resp[0];
    }else{
      global = {
        threshold : 0.7,
        responseList : ['Aradığınızı bulamadım', 'Öğrenmek üzereyim', 'Başka şekilde tarif eder misin?'],
        defaultAuthorizationToken : 'DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6',
        facebookDeployment : {}
      }
      instanceMongoQueries.insertOne('configuration', global, function(resp){});
    }
  })
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.use(express.static(path.join(__dirname, 'webchat')));

app.use(express.static(path.join(__dirname, 'lib')));

app.get('/chat_images.png', function(req, res){
  res.sendFile(__dirname + '/chat_images.png');
})
// html i ekrana basıyor
app.get('/', function(req, res){
    res.sendFile(__dirname + '/MessageDefinitionForIntent.html');
});
// Vue için
app.get('/asset/js/messages.js', function(req, res){
    res.sendFile(__dirname + '/asset/js/messages.js');
});
// Vue için
app.get('/asset/js/index.js', function(req, res){
    res.sendFile(__dirname + '/asset/js/index.js');
});


app.get('/mongo/createCollection/:collectionName', function(req, res){
  instanceMongoQueries.createCollection(req.params.collectionName, function(resp, err){
    res.send({resp : 'OK'});
  });
});

app.post('/mongo/insert/:collectionName', function(req, res){
  if(req.body.obj && Array.isArray(req.body.obj)){
      instanceMongoQueries.insertMany(req.params.collectionName, req.body.obj, function(resp, obj){
        res.send(resp);
      });
  }
  if(req.body.obj && !Array.isArray(req.body.obj)){
    instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){
      res.send(resp);
    });
  }
});

app.get('/mongo/find/:collectionName', function(req, res){
  instanceMongoQueries.find(req.params.collectionName, function(result){
    res.send(result);
  });
});

app.get('/mongo/findByLimitTen/:collectionName', function(req, res){
  instanceMongoQueries.findWithLimit(req.params.collectionName, function(result){
    res.send(result);
  });
});

app.post('/mongo/findByQuery/:collectionName', function(req, res){
  instanceMongoQueries.findByQuery(req.params.collectionName, req.body.query, function(result){
    res.send(result);
  });
});

app.post('/mongo/findByQueryForMessages', function(req, res){
  instanceMongoQueries.findByQuerySort('messages', req.body.query, function(result){
    res.send(result);
  });
});

app.get('/mongo/delete/:collectionName', function(req, res){
  instanceMongoQueries.deleteCollection(req.params.collectionName);
  res.send({resp : 'OK'});
});

// wit e intent olusturyor
app.delete('/delete/intent', cors(), function(req, res){
  var wit = {
    data : { },
    headers : {
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type': 'application/json'
    }
  }
  client.delete('https://api.wit.ai/entities/intent/values/' + encodeURIComponent(req.body.value), wit, function(response){
    instanceMongoQueries.deleteOne('subject_intent_relation', {intent: req.body.value}, function(resp){});
    instanceMongoQueries.deleteOne('answers', {'key' :  req.body.value}, function(resp){
      res.send({resp : 'OK'});
    });
  });
});

app.post('/mongo/post/subjectRelation',cors(),function(req,res){
  instanceMongoQueries.findByQuery('subject_intent_relation', {intent : req.body.intent}, function(response){

    if(response.length == 0){
      instanceMongoQueries.insertOne('subject_intent_relation', {intent: req.body.intent, subject : req.body.subject}, function(resp){
        res.send({resp : 'OK'});
      });
    }else{
      instanceMongoQueries.updateOne('subject_intent_relation', {intent: req.body.intent}, {intent: req.body.intent, subject : req.body.subject}, function(resp){
        res.send({resp : 'OK'});
      });
    }
  })
});

app.post('/mongo/get/subject',cors(),function(req,res){

  instanceMongoQueries.findByQuery('subject_intent_relation', {intent :  req.body.intent}, function(resp){
    res.send(resp);
  });
});

app.delete('/mongo/delete/subjectRelation', cors(), function(req,res){
    instanceMongoQueries.deleteOne('subject_intent_relation', {intent : req.body.intent, subject : req.body.subject}, function(resp){
        res.send(resp);
    });
});

app.get('/mongo/get/subjects', cors(), function(req, res){
  instanceMongoQueries.findByQuery('subject', {}, function(resp){
    res.send(resp);
  });
});

app.delete('/mongo/delete/subject', cors(), function(req, res){
  instanceMongoQueries.deleteOne("subject", {subject : req.body.subject.toLowerCase()}, function(resp){
    res.send(resp);
  });
  instanceMongoQueries.deleteOne('subject_intent_relation', {subject : req.body.subject.toLowerCase()}, function(resp){

  });

});

app.post('/mongo/post/subject', cors(), function(req,res){
  instanceMongoQueries.findByQuery('subject', {subject : req.body.subject.toLowerCase()}, function(resp){
    if(resp.length == 0){
      instanceMongoQueries.insertOne('subject', {subject : req.body.subject.toLowerCase()}, function(response){
      });
    }
    res.send({resp : 'OK'});
  });
});

// wit den intent siliyor
app.post('/create/intent', cors(), function(req, res){
  var wit = {
    data : {
      'value' : req.body.value,
      'expressions' : []
    },
    headers : {
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type': 'application/json'
    }
  }
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    instanceMongoQueries.insertOne('subject_intent_relation', {intent: req.body.value, subject : req.body.subject}, function(resp){});
    res.send(response);
  });
});

// wit den intent i getiriyor
app.get('/get/witai/entities', function(req, res){
  var wit = {
    data : {
      parameters: {}
    },
    headers : {
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type' : 'application/json'
    }
  }
  client.get('https://api.wit.ai/entities/intent', wit, function(response){
    res.send(response);
  });
})

// wit intent ine cümle kaydediyor
app.post('/post/intent/expressions', function(req, res){
  console.log(req.body);
  var wit = {
    data : {
  		value : req.body.value,
  		expressions : req.body.expressions
    },
    headers : {
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type' : 'application/json'
    }
  }
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    res.send(response);
  });
});

// wit intent inden cümle siliyor
app.delete('/delete/intent/expressions', function(req, res){
  console.log(req.body.expression);
	var wit = {
		data : { },
		headers : {
		  'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
		  'Content-Type' : 'application/json'
		}
	}
	client.delete('https://api.wit.ai/entities/intent/values/' + req.body.value + '/expressions/' + encodeURIComponent(req.body.expression), wit, function(response){
		res.send(response);
	});
});

// intent icin cevap ekleme
app.post('/send/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.findByQuery('answers', {'key' :  req.body.intent }, function(resp){
    console.log(resp);
    if(resp.length > 0){
      instanceMongoQueries.updateOne('answers', { 'key' :  req.body.intent }, { $set: {'key' : req.body.intent, 'value' : req.body.message, 'type' : 'text'}}, function(resp){});
    }else{
      instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.message, 'type' : 'text'} , function(resp){});
    }

  })

  res.send({ resp : 'OK'});
});

// intent icin cevap getirme
app.get('/get/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.findByQuery('answers', {'key' :  queryString.parse(req.query()).intent }, function(resp){
      res.send(resp[0]);
  });
});

// intent icin cevap silme
app.delete('/delete/meaningful/sentence', cors(), function (req, res) {
  instanceMongoQueries.deleteOne('answers', {'key' :  queryString.parse(req.query()).intent }, function(resp){
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
})

app.post('/witaiCreateApp/post', cors(), function(req, res){
    console.log(req.body.application);
    var wit = {
      data : {
        "name":req.body.application.name,
       "lang":req.body.application.language,
       "private":req.body.application.prvt,
       "desc" : req.body.application.description
      },
      headers : {
        'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
        'Content-Type' : 'application/json'
      }
    }

    client.post('https://api.wit.ai/apps', wit, function(response){
        res.send(response);
    });
});

// WEB API for wit.ai
app.post('/api/getMessage/witai/:collectionName', cors(), function(req, res){
  var wit = {
    data : {
      parameters: {}
    },
    headers : {
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type' : 'application/json'
    }
  }

  var searchedItem = req.body.obj.message.text.replace(/(<img\s[^>]*?src\s*=\s*['\"]([^'\"]*?)['\"][^>]*?>)/g,"");

  instanceMongoQueries.findByQuery('emoji_relation', {'source.text' : searchedItem},function(resppp){

      if(resppp.length > 0){

        var msg = {text : resppp[0].target, type : 'emoji'};

        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : resppp[0].source, type : 'emoji'}, 'user_id' : req.cookies.user_id, 'created_date' : new Date()};
        instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp,obj){
            res.send({text : resppp[0].target, type : 'emoji'});
        });
        obj = {'transaction' : req.body.obj.transaction, 'message' : {text : resppp[0].target, type : 'emoji'}, 'user_id' :  req.cookies.user_id +'_BOT', 'created_date' : new Date()};
        instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){

        });
      }else{
        console.log(req.session.subject);
        if(req.session.subject){
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
                    client.get('https://api.wit.ai/message?q=' + encodeURIComponent(req.session.subject + " " +searchedItem), wit, function(response){
                        if(response.entities && response.entities.intent && response.entities.intent.length > 0){
                          maxFirst = -1;
                          maxValueFirst = '';
                          for(var i = 0; i < response.entities.intent.length; i++){
                            if(maxFirst < response.entities.intent[i].confidence){
                              maxValueFirst = response.entities.intent[i].value;
                              maxFirst = response.entities.intent[i].confidence;
                            }
                          }
                          if(maxFirst < global.threshold){
                            var random = Math.floor(Math.random() * (global.responseList.length - 1));
                            var text = global.responseList[random];
                            req.body.obj.created_date = new Date();
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id +'_BOT', 'created_date' : new Date()};
                            instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
                            instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
                            req.body.obj.confidenceLevel = maxFirst;
                            req.body.obj.intentName = maxValueFirst;
                            instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                            res.send({text : text});
                            return;
                          }

                          instanceMongoQueries.findByQuery('answers', {'key' :   maxValueFirst }, function(response){
                            if(response.length > 0){
                                if(req.body.obj){
                                  req.body.obj.created_date = new Date();
                                  req.body.obj.confidenceLevel = maxFirst;
                                  req.body.obj.intentName = maxValueFirst;
                                  var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                                  instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){

                                  });
                                  instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp,obj){
                                      res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ""});
                                  });

                                }

                              }else{
                                var random = Math.floor(Math.random() * (global.responseList.length - 1));
                                var text = global.responseList[random];
                                req.body.obj.created_date = new Date();
                                var obj = {'transaction':req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                                instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
                                instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
                                instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                                res.send({text : text});
                              }
                          });

                        }

                    });
                  return;
                }else{

                  instanceMongoQueries.findByQuery('subject_intent_relation',{intent : maxValueFirst},function(sResponse){
                    console.log(sResponse);
                    if(sResponse.length > 0){
                      req.session.subject = sResponse[0].subject;
                    }

                    instanceMongoQueries.findByQuery('answers', {'key' :   maxValueFirst }, function(response){
                      if(response.length > 0){
                          if(req.body.obj){
                            req.body.obj.created_date = new Date();
                            req.body.obj.confidenceLevel = maxFirst;
                            req.body.obj.intentName = maxValueFirst;
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                            instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){
                            });
                            instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp,obj){
                                res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ""});
                            });
                          }

                        }else{
                          var random = Math.floor(Math.random() * (global.responseList.length - 1));
                          var text = global.responseList[random];
                          req.body.obj.created_date = new Date();
                          var obj = {'transaction':req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                          instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
                          instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
                          instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                          res.send({text : text});
                        }
                    });


                  });
                }
            }else{
              client.get('https://api.wit.ai/message?q=' + encodeURIComponent(req.session.subject + " " +searchedItem), wit, function(response){
                  if(response.entities && response.entities.intent && response.entities.intent.length > 0){
                    maxFirst = -1;
                    maxValueFirst = '';
                    for(var i = 0; i < response.entities.intent.length; i++){
                      if(maxFirst < response.entities.intent[i].confidence){
                        maxValueFirst = response.entities.intent[i].value;
                        maxFirst = response.entities.intent[i].confidence;
                      }
                    }
                    if(maxFirst < global.threshold){
                      var random = Math.floor(Math.random() * (global.responseList.length - 1));
                      var text = global.responseList[random];
                      req.body.obj.created_date = new Date();
                      var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                      instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
                      instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});

                      req.body.obj.confidenceLevel = maxFirst;
                      req.body.obj.intentName = maxValueFirst;
                      instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                      res.send({text : text});
                      return;
                    }

                    instanceMongoQueries.findByQuery('answers', {'key' :   maxValueFirst }, function(response){
                      if(response.length > 0){
                          if(req.body.obj){
                            req.body.obj.created_date = new Date();
                            req.body.obj.confidenceLevel = maxFirst;
                            req.body.obj.intentName = maxValueFirst;
                            var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                            instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){

                            });
                            instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp,obj){
                                res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ""});
                            });

                          }

                        }else{
                          var random = Math.floor(Math.random() * (global.responseList.length - 1));
                          var text = global.responseList[random];
                          req.body.obj.created_date = new Date();
                          var obj = {'transaction':req.body.obj.transaction, 'message' : {text : text}, 'user_id' :req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                          instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
                          instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
                          instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                          res.send({text : text});
                        }
                    });
                  }

              });
            }
          });
        }else{
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
                var random = Math.floor(Math.random() * (global.responseList.length - 1));
                var text = global.responseList[random];
                req.body.obj.created_date = new Date();
                var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});

                instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});

                req.body.obj.confidenceLevel = maxFirst;
                req.body.obj.intentName = maxValueFirst;
                instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                res.send({text : text});
                return;
              }

              instanceMongoQueries.findByQuery('subject_intent_relation',{intent : maxValueFirst},function(sResponse){
                console.log(sResponse);
                if(sResponse.length > 0){
                  req.session.subject = sResponse[0].subject;
                }

                instanceMongoQueries.findByQuery('answers', {'key' :   maxValueFirst }, function(response){
                  if(response.length > 0){
                      if(req.body.obj){
                        req.body.obj.created_date = new Date();
                        req.body.obj.confidenceLevel = maxFirst;
                        req.body.obj.intentName = maxValueFirst;
                        var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                        instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){

                        });
                        instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp,obj){
                            res.send({text : response[0].value, type : response[0].type, intent : response[0].key, subject : ""});
                        });

                      }

                    }else{
                      var random = Math.floor(Math.random() * (global.responseList.length - 1));
                      var text = global.responseList[random];
                      req.body.obj.created_date = new Date();
                      var obj = {'transaction':req.body.obj.transaction, 'message' : {text : text}, 'user_id' :req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
                      instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});

                      instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});

                      instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
                      res.send({text : text});
                    }
                });


              });
            }else{
              var random = Math.floor(Math.random() * (global.responseList.length - 1));
              var text = global.responseList[random];
              req.body.obj.created_date = new Date();
              var obj = {'transaction' : req.body.obj.transaction, 'message' : {text : text}, 'user_id' : req.body.obj.user_id+'_BOT', 'created_date' : new Date()};
              instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
              instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
              instanceMongoQueries.insertOne('training_messages', req.body.obj, function(resp, obj){});
              res.send({text : text});
            }
          });
        }

      }
  });
});


app.post('/view/create/carousel', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne('answers', {'key' : req.body.intent}, {$set :  {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'carousel'}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'carousel'} , function(resp){});
      }
        res.send({ resp : 'OK'});
    });
});

app.post('/view/get/carousel', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/quickReply', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne('answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.quickReply, 'type' : 'quickReply'}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.quickReply, 'type' : 'quickReply'}, function(resp){});
      }
        res.send({ resp : 'OK'});
    });
});

app.post('/view/get/quickReply', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent }, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/get/emoji', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent }, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/emoji', cors(), function(req, res){
  //req.body.emoji , req.body.intent
  //ilk sayfa yaparak başlayalım en iyisi ok
  //instanceMongoQueries.insertOne("emoji_relation"{});
});

app.get('/mongo/emojiRelation/get',cors(),function(req,res){
  instanceMongoQueries.findByQuery('emoji_relation', {}, function(resp){
    res.send(resp);
  });
});

app.get('/mongo/emoji/get', cors(), function(req, res){
  instanceMongoQueries.findByQuery('emoji', {}, function(resp){
    res.send(resp);
  });
});

app.delete('/delete/emoji/relation',cors(),function(req,res){
  instanceMongoQueries.deleteOne('emoji_relation', {'source.text' : req.body.text}, function(resp){
    res.send({ resp : 'OK'});
  });
});

app.post('/save/emoji/relation', cors(), function(req, res){
  //req.body.emoji , req.body.intent
  instanceMongoQueries.findByQuery('emoji_relation', {source : req.body.source}, function(resp){
      if(resp.length > 0 ){
        instanceMongoQueries.updateOne('emoji_relation', {source : req.body.source}, {source : req.body.source, target : req.body.target}, function(resp){
          res.send(resp);
        });
      }else{
        instanceMongoQueries.insertOne('emoji_relation', {source : req.body.source, target : req.body.target}, function(resp){
          res.send(resp);
        });
      }
  });
});

app.post('/view/create/listTemplate', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne('answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.listTemplate, 'type' : 'listTemplate'}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.listTemplate, 'type' : 'listTemplate'}, function(resp){});
      }
        res.send({ resp : 'OK'});
    });
});

app.post('/view/get/listTemplate', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent }, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/genericButtons', cors(), function(req, res){
    instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
      if(resp.length > 0){
        instanceMongoQueries.updateOne('answers', {'key' : req.body.intent}, {$set : {'key' : req.body.intent, 'value' : req.body.genericButtons, 'type' : 'genericButtons'}}, function(resp){});
      }else{
        instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.genericButtons, 'type' : 'genericButtons'}, function(resp){});
      }
        res.send({ resp : 'OK'});
    });
});

app.post('/view/get/genericButtons', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent }, function(resp){
      res.send(resp[0]);
  });
});

app.post('/view/create/attachment', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent}, function(resp){
    if(resp.length > 0){
      instanceMongoQueries.updateOne('answers', {'key' : req.body.intent}, {$set :  {'key' : req.body.intent, 'value' : req.body.attachments, 'type' : 'attachment'}}, function(resp){});
    }else{
      instanceMongoQueries.insertOne('answers', {'key' : req.body.intent, 'value' : req.body.attachments, 'type' : 'attachment'}, function(resp){});
    }
      res.send({ resp : 'OK'});
  });

});

app.post('/view/get/attachment', cors(), function(req, res){
  instanceMongoQueries.findByQuery('answers', {'key' : req.body.intent }, function(resp){
      res.send(resp[0]);
  });
});


// angular facebook deploy get
app.get('/facebook/get', cors(), function (req, res) {
  instanceMongoQueries.find('configuration', function(resp){
    res.send(resp);
  })
});

// angular facebook deploy post
app.post('/facebook/post', cors(), function (req, res) {
  console.log(req.body.facebookDeployment);
  instanceMongoQueries.updateOne('configuration', {}, { $set : {facebookDeployment : req.body.facebookDeployment}}, function(err, resp){
    global.facebookDeployment = req.body.facebookDeployment;
  })
	var facebookClass = new FaceBookClass(
    req.body.facebookDeployment.pageId,
    req.body.facebookDeployment.appId,
    req.body.facebookDeployment.appSecret,
    req.body.facebookDeployment.accessToken,
    req.body.facebookDeployment.verifyToken, global, instanceMongoQueries);
	facebookClass.botListen();
	res.send({data : 'OK'});
});

app.post('/witaiDeploy/post', cors(), function (req, res) {
  instanceMongoQueries.updateOne('configuration', {}, {$set : {defaultAuthorizationToken : req.body.witDeployment}}, function(err, resp){
    res.send({data : 'OK'});
    global.defaultAuthorizationToken = req.body.witDeployment;
  })

});

app.get('/witaiDeploy/get', cors(), function (req, res) {
  instanceMongoQueries.find('configuration', function(resp){
    res.send(resp);
  })
});

// angular project info deploy get bunları silsek mi? sileyim ama sildikten sonra 5 dfakka mola :Dok
app.post('/witai/delete', function(req, res){
  instanceMongoQueries.deleteFromTrainingMessage(req.body.message, function(resp){
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
      'Authorization' : 'Bearer ' + global.defaultAuthorizationToken,
      'Content-Type' : 'application/json'
    }
  }
  client.post('https://api.wit.ai/entities/intent/values', wit, function(response){
    instanceMongoQueries.deleteFromTrainingMessage(req.body.message, function(resp){
      res.send(resp);
    });
  });
});

app.get('/change/threshold/:threshold', function(req, res){
  global.threshold = req.params.threshold;
  instanceMongoQueries.updateOne('configuration', {}, {$set : {threshold : req.params.threshold }}, function(err, resp){
    res.send(resp);
  })
});

app.get('/get/threshold/', function(req, res){
  instanceMongoQueries.find('configuration', function(resp){
    res.send(resp);
  })
});

app.get('/add/responseList/:response', function(req, res){
  instanceMongoQueries.updateOne('configuration', {}, {$push : {responseList : req.params.response}}, function(err, resp){
    res.send(resp);
  })
});

app.delete('/delete/responseList/:response', function(req, res){
  instanceMongoQueries.updateOne('configuration', {}, {$pull : {responseList : req.params.response}}, function(err, resp){
    res.send(resp);
  })
});

app.listen(8000);
