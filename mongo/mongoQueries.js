var mongoQueries = class MongoQueries {
  constructor(db){
    this.db = db;
  }
  createCollection(dbName,collectionName, callback){
    this.db.db(dbName).createCollection(collectionName, function(err, res) {
      if (err) throw err;
      callback(res, err);
    });
  }
  insertMany(dbName,collectionName, obj, callback){
    this.db.db(dbName).collection(collectionName).insertMany(obj, function(err, res) {
      if (err) throw err;
      callback({res : 'OK'}, obj);
    });
  }
  insertOne(dbName,collectionName, obj, callback){
    this.db.db(dbName).collection(collectionName).insertOne(obj, function(err, res) {
      if (err) throw err;
      callback({res : 'OK'}, obj);
    });
  }
  find(dbName,collectionName, callback){
    this.db.db(dbName).collection(collectionName).find({}).toArray(function(err, res) {
     if (err) throw err;
      callback(res);
    });
  }
  findWithLimit(dbName,collectionName, callback){
    this.db.db(dbName).collection(collectionName).find({}).limit(10).toArray(function(err, res) {
     if (err) throw err;
      callback(res);
    });
  }
  findByQuery(dbName,collectionName, query, callback){
    this.db.db(dbName).collection(collectionName).find(query).toArray(function(err, res) {
     if (err) throw err;
      callback(res);
    });
  }
  findByQuerySort(dbName,collectionName, query, callback){
    this.db.db(dbName).collection(collectionName).find(query).sort({'created_date' : -1}).limit(100).toArray(function(err, res) {
     if (err) throw err;
      callback(res);
    });
  }
  deleteCollection(dbName,collectionName){
      this.db.db(dbName).collection(collectionName).drop();
  }
  deleteFromTrainingMessage(dbName,message, callback){
    var myquery = {'message' : {'text' : message}};
      this.db.db(dbName).collection('training_messages').deleteMany(myquery, function(err, obj) {
    if (err) throw err;
      callback(obj);
    });
  }
  deleteOne(dbName,collectionName,query, callback){
    this.db.db(dbName).collection(collectionName).deleteOne(query, function(err, obj) {
      if (err) throw err;
      callback(obj);
    });
  }
  deleteMany(dbName,collectionName,query, callback){
    this.db.db(dbName).collection(collectionName).deleteMany(query, function(err, obj) {
      if (err) throw err;
      callback(obj);
    });
  }
  updateOne(dbName,collectionName, query, newValues, callback){
    this.db.db(dbName).collection(collectionName).update(query, newValues, function(err, res) {
     if (err) throw err;
      callback(res);
    });
  }
  distinct(dbName,collectionName,key){
    return this.db.db(dbName).collection(collectionName).distinct(key);
  }
}

module.exports = mongoQueries;
