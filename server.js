var express = require('express');
var app = express();
var cors = require('cors');
var firebase = require('firebase');
var mongo = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
// var MessengerPlatform = require('facebook-bot-messenger');
var FaceBookClass = require('./facebook/facebook');
var MongoQueries = require('./mongo/mongoQueries');
var SkypeClass = require('./skype/skypeClass');
var Client = require('node-rest-client').Client;
var Carousel = require('./views/carousel');
const queryString = require('query-string');
var client = new Client();



firebase.initializeApp({
    databaseURL: 'https://conbot-34186.firebaseio.com',
    serviceAccount: 'google-services.json',
});

var url = "mongodb://localhost:27017/conbot";
let instanceMongoQueries;

let global= {
}

mongo.connect(url, function(err, db) {
  if (err) throw err;
  instanceMongoQueries = new MongoQueries(db);
  instanceMongoQueries.find("configuration",function(resp){
    console.log(resp);
    if(resp && resp.length > 0){
      global = resp[0];
    }else{
      global = {
        threshold : 0.7,
        responseList : ['Aradığınızı bulamadım','Öğrenmek üzereyim','Başka şekilde tarif eder misin?']
      }
      instanceMongoQueries.insertOne("configuration",global,function(resp){});
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


app.get('/webchat', function(req, res){
  res.sendFile(__dirname + "/webchat/webchat.html");
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


app.get("/mongo/createCollection/:collectionName", function(req, res){
  instanceMongoQueries.createCollection(req.params.collectionName, function(resp,err){
    res.send({resp : 'OK'});
  });
});

app.post("/mongo/insert/:collectionName", function(req, res){
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

app.get("/mongo/find/:collectionName", function(req, res){
  instanceMongoQueries.find(req.params.collectionName, function(result){
    res.send(result);
  });
});

app.get("/mongo/findByLimitTen/:collectionName", function(req, res){
  instanceMongoQueries.findWithLimit(req.params.collectionName, function(result){
    res.send(result);
  });
});

app.post("/mongo/findByQuery/:collectionName", function(req, res){
  instanceMongoQueries.findByQuery(req.params.collectionName, req.body.query, function(result){
    res.send(result);
  });
});

app.get("/mongo/delete/:collectionName", function(req, res){
  instanceMongoQueries.deleteCollection(req.params.collectionName);
  res.send({resp : "OK"});
});

// wit e intent olusturyor
app.delete("/delete/intent", cors(), function(req, res){
  var wit = {
    data : { },
    headers : {
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.delete("https://api.wit.ai/entities/intent/values/"+encodeURIComponent(req.body.value), wit, function(response){
    var ref = firebase.database().ref("/answer");
    ref.once("value", function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
          ref.child('/').child(childSnapshot.key).once('value', function(itemSnapshot) {
            if(itemSnapshot.val().key == req.body.value){
              ref.child('/').child(childSnapshot.key).remove();
              res.send(response);
            }
          });
        });
    });
  });
});

// wit den intent siliyor
app.post("/create/intent", cors(), function(req, res){
  var wit = {
    data : {
      "value" : req.body.value,
      "expressions":[]
    },
    headers : {
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.post("https://api.wit.ai/entities/intent/values", wit, function(response){
    res.send(response);
  });
});

// wit den intent i getiriyor
app.get("/get/witai/entities", function(req, res){
  var wit = {
    data : {
      parameters: {}
    },
    headers : {
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.get("https://api.wit.ai/entities/intent", wit, function(response){
    res.send(response);
  });
})

// wit intent ine cümle kaydediyor
app.post("/post/intent/expressions", function(req, res){
  var wit = {
    data : {
  		value : req.body.value,
  		expressions : req.body.expressions
    },
    headers : {
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.post("https://api.wit.ai/entities/intent/values", wit, function(response){
    res.send(response);
  });
});

// wit intent inden cümle siliyor
app.delete("/delete/intent/expressions", function(req, res){
  console.log(req.body.expression);
	var wit = {
		data : { },
		headers : {
		  "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
		  "Content-Type": "application/json"
		}
	}
	client.delete("https://api.wit.ai/entities/intent/values/"+req.body.value+"/expressions/"+encodeURIComponent(req.body.expression), wit, function(response){
		res.send(response);
	});
});

// http://localhost:8000/hello yazdığında fireabase database in tamamını basıyor ekrana
app.get('/hello', cors(), function (req, res) {
	var ref = firebase.database().ref("/");
  ref.once("value", function(snapshot) {
  		res.send(snapshot);
  	}, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
	});
});

// intent icin cevap ekleme
app.post('/send/meaningful/sentence', cors(), function (req, res) {
	var ref = firebase.database().ref("/answer");
  var set = { 'key' : req.body.intent, 'value' : req.body.message, 'type' : 'text'};
  ref.child("/").once("value", function(snapshot) {
    var found = false;
    snapshot.forEach(function(userSnapshot) {
        if(userSnapshot.val().key == set.key){
          ref.child("/").child(userSnapshot.key).update(set);
          found = true;
        }
    });
    if(!found){
      ref.child("/").push(set)
    }
  });
  res.send({ resp : "OK"});
});

// intent icin cevap getirme
app.get('/get/meaningful/sentence', cors(), function (req, res) {
  var ref = firebase.database().ref("/answer");
  ref.once("value", function(snapshot) {
      var array = snapshot.val();
      for(var key in array){
        if(array[key].key == queryString.parse(req.query()).intent){
          res.send({resp : array[key].value, type : array[key].type});
          return;
        }
      }
      res.send({resp : "NOT_FOUND"});
  });
});

// intent icin cevap silme
app.delete('/delete/meaningful/sentence', cors(), function (req, res) {
  var ref = firebase.database().ref("/answer");
  ref.once("value", function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        ref.child('/').child(childSnapshot.key).once('value', function(itemSnapshot) {
          if(itemSnapshot.val().key == queryString.parse(req.query()).intent){
            itemSnapshot.delete();
          }
        });
      });
  });
});

//** WEB API for dialogflow**//
app.get('/api/getMessage/dialogFlow', cors(), function(req, res){
  var dialog = {
    data : {
              "lang": "en",
              "query": queryString.parse(req.query()).message,
              "sessionId": "12345",
              "timezone": "Asia/Istanbul"
            },
            headers : {
              "Authorization" : "Bearer 327778ba5583490284a126400602a3b0",
              "Content-Type": "application/json"
            }
  }
  client.post("https://api.dialogflow.com/v1/query?v=20183001", dialog, function(response){
    let text = response.result.fulfillment.speech;
    res.send({resp : text});
  });
})

// WEB API for wit.ai
app.post('/api/getMessage/witai/:collectionName', cors(), function(req, res){
  var wit = {
    data : {
      parameters: {}
    },
    headers : {
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.get("https://api.wit.ai/message?q="+encodeURIComponent(req.body.obj.message.text), wit, function(response){
    if(response.entities && response.entities.intent && response.entities.intent.length > 0){
      var max = -1;
      var maxValue = "";
      for(var i= 0; i < response.entities.intent.length; i++){
        if(max <response.entities.intent[i].confidence ){
          maxValue = response.entities.intent[i].value;
          max = response.entities.intent[i].confidence;
        }
      }
      //max configdence sahip intent i bulamadıysam
      if(max < global.threshold){
        var random = Math.floor(Math.random() * (global.responseList.length - 1));
        var text = global.responseList[random];
        req.body.obj.created_date = new Date();
        instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
        var obj = {"transaction":req.body.obj.transaction, "message":{text : text}, "user_id":"BOT", "created_date": new Date()};
        instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
        req.body.obj.confidenceLevel = max;
        req.body.obj.intentName = maxValue;
        instanceMongoQueries.insertOne("training_messages", req.body.obj, function(resp, obj){});
        res.send({text : text});
        return;
      }
      var ref = firebase.database().ref("/answer");
      ref.once("value", function(snapshot) {
          snapshot.forEach(function(childSnapshot) {
            ref.child('/').child(childSnapshot.key).once('value', function(itemSnapshot) {
              if(itemSnapshot.val().key == maxValue){
                if(req.body.obj){
                  req.body.obj.created_date = new Date();
                  req.body.obj.confidenceLevel = max;
                  req.body.obj.intentName = maxValue;
                  instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp,obj){
                      res.send({text : itemSnapshot.val().value, type : itemSnapshot.val().type, intent : itemSnapshot.val().key});
                  });
                  var obj = {"transaction":req.body.obj.transaction, "message":{text : itemSnapshot.val().value, type : itemSnapshot.val().type, intent : itemSnapshot.val().key}, "user_id":"BOT", "created_date": new Date()};
                  instanceMongoQueries.insertOne(req.params.collectionName,obj,function(resp,obj){

                  });
                }
              }
            });
          });
      });
    }else{
      var random = Math.floor(Math.random() * (global.responseList.length - 1));
      var text = global.responseList[random];
      req.body.obj.created_date = new Date();
      instanceMongoQueries.insertOne(req.params.collectionName, req.body.obj, function(resp, obj){});
      var obj = {"transaction":req.body.obj.transaction, "message":{text : text}, "user_id":"BOT", "created_date": new Date()};
      instanceMongoQueries.insertOne(req.params.collectionName, obj, function(resp, obj){});
      instanceMongoQueries.insertOne("training_messages", req.body.obj, function(resp, obj){});
      res.send({text : text});
    }
  });
})


app.post('/view/create/carousel', cors(), function(req, res){
    var carousel = new Carousel(req.body.obj);
    var ref = firebase.database().ref("/answer");
    var set = { 'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'carousel'};
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == set.key){
            ref.child("/").child(userSnapshot.key).update(set);
            found = true;
          }
      });
      if(!found){
        ref.child("/").push(set)
      }
    });
    res.send({ resp : "OK"});
});

app.post('/view/get/carousel', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == req.body.intent){
            res.send(userSnapshot.val())
            found = true;
          }
      });
      if(!found){
        res.send({resp : "NOT_FOUND"});
      }
    });
});

app.post('/view/create/quickReply', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    var set = {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'quickReply'};
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == set.key){
            ref.child("/").child(userSnapshot.key).update(set);
            found = true;
          }
      });
      if(!found){
        ref.child("/").push(set)
      }
    });
    res.send({ resp : "OK"});
});

app.post('/view/get/quickReply', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == req.body.intent){
            res.send(userSnapshot.val())
            found = true;
          }
      });
      if(!found){
        res.send({resp : "NOT_FOUND"});
      }
    });
});

app.post('/view/create/listTemplate', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    var set = {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'listTemplate'};
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == set.key){
            ref.child("/").child(userSnapshot.key).update(set);
            found = true;
          }
      });
      if(!found){
        ref.child("/").push(set)
      }
    });
    res.send({ resp : "OK"});
});

app.post('/view/get/listTemplate', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == req.body.intent){
            res.send(userSnapshot.val())
            found = true;
          }
      });
      if(!found){
        res.send({resp : "NOT_FOUND"});
      }
    });
});

app.post('/view/create/genericButtons', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    var set = {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'genericButtons'};
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == set.key){
            ref.child("/").child(userSnapshot.key).update(set);
            found = true;
          }
      });
      if(!found){
        ref.child("/").push(set)
      }
    });
    res.send({ resp : "OK"});
});

app.post('/view/get/genericButtons', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == req.body.intent){
            res.send(userSnapshot.val())
            found = true;
          }
      });
      if(!found){
        res.send({resp : "NOT_FOUND"});
      }
    });
});

app.post('/view/create/attachment', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    var set = {'key' : req.body.intent, 'value' : req.body.obj, 'type' : 'attachment'};
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == set.key){
            ref.child("/").child(userSnapshot.key).update(set);
            found = true;
          }
      });
      if(!found){
        ref.child("/").push(set)
      }
    });
    res.send({ resp : "OK"});
});

app.post('/view/get/attachment', cors(), function(req, res){
    var ref = firebase.database().ref("/answer");
    ref.child("/").once("value", function(snapshot) {
      var found = false;
      snapshot.forEach(function(userSnapshot) {
          if(userSnapshot.val().key == req.body.intent){
            res.send(userSnapshot.val())
            found = true;
          }
      });
      if(!found){
        res.send({resp : "NOT_FOUND"});
      }
    });
});


// angular facebook deploy get
app.get('/facebook/get', cors(), function (req, res) {
	res.setHeader('content-type', 'application/json');
	var ref = firebase.database().ref("/deploymentFacebook");
	ref.once("value", function(snapshot) {
		res.send(snapshot);
	}, function (errorObject) {
	  console.log("Firebase read failed: " + errorObject.code);
	});
});

// angular facebook deploy post
app.post('/facebook/post', cors(), function (req, res) {
	var ref = firebase.database().ref("/deploymentFacebook").update(req.body.facebookDeployment);
	var facebookClass = new FaceBookClass(
    req.body.facebookDeployment.pageId,
    req.body.facebookDeployment.appId,
    req.body.facebookDeployment.appSecret,
    req.body.facebookDeployment.accessToken,
    req.body.facebookDeployment.verifyToken,global,firebase);
	facebookClass.botListen();
	res.send({data : "OK"});
});

// angular skype deploy get
app.get('/skype/get', cors(), function (req, res) {
	var ref = firebase.database().ref("/deploymentSkype");
	ref.once("value", function(snapshot) {
		res.send(snapshot);
	}, function (errorObject) {
	  console.log("Firebase read failed: " + errorObject.code);
	});
});

// angular skype deploy post
app.post('/skype/post', cors(), function (req, res) {
	var ref = firebase.database().ref("/deploymentSkype").update(req.body.skypeDeployment);
	//skype listen olacak burda sonra yaparım bir deneyelim
  var skypeClass = new SkypeClass(
    req.body.skypeDeployment.appId,
    req.body.skypeDeployment.appPassword);
  skypeClass.botPrepare();
	res.send({data : "OK"});
});

// angular project info deploy get
app.get('/projectinfo/get', cors(), function (req, res) {
	res.setHeader('content-type', 'application/json');
	var ref = firebase.database().ref("/projectInfo");
	ref.once("value", function(snapshot) {
		res.send(snapshot);
	}, function (errorObject) {
	  console.log("Firebase read failed: " + errorObject.code);
	});
});

// angular project info deploy post
app.post('/projectinfo/post', cors(), function (req, res) {
	console.log(req.body.projectInfo);
	var ref = firebase.database().ref("/projectInfo").update(req.body.projectInfo);
	var facebookClass = new FaceBookClass(
    req.body.projectInfo.projectName,
    req.body.projectInfo.projectLocation,
    req.body.projectInfo.projectType);
	facebookClass.botListen();
	res.send({data : "OK"});
});

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
      "Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
      "Content-Type": "application/json"
    }
  }
  client.post("https://api.wit.ai/entities/intent/values", wit, function(response){
    instanceMongoQueries.deleteFromTrainingMessage(req.body.message, function(resp){
      res.send(resp);
    });
  });
});

app.get("/change/threshold/:threshold", function(req, res){
  global.threshold = req.params.threshold;
  instanceMongoQueries.updateOne("configuration", {}, { $set: {threshold: req.params.threshold }}, function(err, resp){
    res.send(resp);
  })
});

app.get("/get/threshold/", function(req, res){
  instanceMongoQueries.find("configuration", function(resp){
    res.send(resp);
  })
});
app.get("/add/responseList/:response", function(req, res){
  instanceMongoQueries.updateOne("configuration", {}, { $push: {responseList: req.params.response}}, function(err, resp){
    res.send(resp);
  })
});

app.delete("/add/responseList/:response", function(req, res){
  instanceMongoQueries.updateOne("configuration", {}, { $pull: {responseList: req.params.response}}, function(err, resp){
    res.send(resp);
  })
});

app.listen(8000);
