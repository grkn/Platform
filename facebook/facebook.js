const http = require('http');
const https = require('https');
var express = require('express');
const Bot = require('messenger-bot');
var Client = require('node-rest-client').Client;
var ListTemplate = require('../views/listTemplate');
var Carousel = require('../views/carousel');
var QuickReply = require('../views/quickreply');
var GenericButtons = require('../views/genericButtons');
var Attachment = require('../views/attachment');
var fs = require('fs');
var client = new Client();
const url = require('url')
const qs = require('querystring')
const request = require('request')
const crypto = require('crypto')


'use strict'
var facebookclass = class FacebookBotClass {

	constructor(){
		if(!this.configuration){
			this.configuration = {};
		}
	}

	setWebhook(webhook){
		this.webhook = webhook;
		this.configuration[this.webhook] = {};
	}

	setVerifyToken(verifyToken){
		this.configuration[this.webhook].verifyToken = verifyToken;
	}

	setAppSecret(appSecret){
		this.configuration[this.webhook].appSecret = appSecret;
	}

	setToken(pageToken){
		this.configuration[this.webhook].token = pageToken;
	}

	setGlobal(gl){
		this.configuration[this.webhook].global = gl;
	}

	setInstanceMongoQueries(instanceMongoQueries){
		this.instanceMongoQueries = instanceMongoQueries;
	}

	setAuthorization(authorization){
		this.configuration[this.webhook].authorization = authorization;
	}

	// constructor(pageId, appId, appSecret, pageToken, verifyToken, globals, instanceMongoQueries,authorization) {
	//
	// 		this.token = pageToken;
	// 		this.authorization = authorization;
	// 		this.global = globals;
	// 		this.verifyToken = verifyToken;
	// 		this.pageToken = pageToken;
	// 		this.app_secret : appSecret;
	//
	// 		console.log(globals);
	// 		this.instanceMongoQueries = instanceMongoQueries;
	// 		// if(this.global.persistentMenu){
	// 		// 	var array = [];
	// 		// 	for(var i = 0; i < this.global.persistentMenu.length; i++){
	// 		// 		if(this.global.persistentMenu[i].text.indexOf('http') != -1){
	// 		// 			array.push({title : this.global.persistentMenu[i].name, type : 'web_url', url : this.global.persistentMenu[i].text, 'webview_height_ratio' : 'full'});
	// 		// 		}else{
	// 		// 			array.push({title : this.global.persistentMenu[i].text, type : 'postback', payload : this.global.persistentMenu[i].text});
	// 		// 		}
	// 		// 	}
	// 		// 	//persistent menu
	// 		// 	this.bot.setPersistentMenu (array, function(dt){
	// 		// 		console.log(dt);
	// 		// 	});
	// 		// }
  // }

	sendMessage (recipient, payload, cb) {
		if (!cb) cb = Function.prototype;
		console.log("Configuration");
		console.log(this.configuration);
		request({
			method : 'POST',
			uri : 'https://graph.facebook.com/v2.6/me/messages',
			qs : {
				access_token: this.configuration[this.webhook].token
			},
			json : {
				recipient : { id : recipient },
				message : payload
			}
		}, (err, res, body) => {
			if (err) return cb(err)
			if (body.error) return cb(body.error)

			cb(null, body)
		})
	}


	botListen(){
		var subjectArray = {};

		var privateKey = fs.readFileSync('private.pem', 'utf8');
		var certificate = fs.readFileSync('cert.pem', 'utf8');
		var botPrepareResponse = this.botPrepareResponse;
		var _this = this;
		https.createServer({
		    key: privateKey,
		    cert: certificate,
				ca : [
					fs.readFileSync('bundle1.pem', 'utf8'),
					fs.readFileSync('bundle2.pem', 'utf8'),
					fs.readFileSync('bundle3.pem', 'utf8'),
				]
		}, function(req,res){
			res.writeHead(200, { 'Content-Type' : 'application/json' })

			let path = req.path();
			for(var key in  _this.configuration){
				console.log(key);
				if(key.indexOf(path) != -1){
					console.log("Found : " + key);
					_this.webhook = key;
					break;
				}
			}

			if (req.url === '/_status') return res.end(JSON.stringify({status : 'OK'}))
			if(!_this.configuration[_this.webhook]){
				console.log(this.configuration);
				res.end('Error, wrong validation token');
				return;
			}
			if (_this.configuration[_this.webhook].verifyToken && req.method === 'GET') {
				let query = qs.parse(url.parse(req.url).query);
				if (query['hub.verify_token'] === _this.configuration[_this.webhook].verifyToken) {
					res.end(query['hub.challenge']);
					return;
				}
				res.end('Error, wrong validation token');
				return;
			}

			let body = '';

			req.on('data', (chunk) => {
				body += chunk
			})

			req.on('end', () => {
				// check message integrity
				if (_this.configuration[_this.webhook].appSecret) {
					let hmac = crypto.createHmac('sha1', _this.configuration[_this.webhook].appSecret);
					hmac.update(body);

					if (req.headers['x-hub-signature'] !== `sha1=${hmac.digest('hex')}`) {
						console.log("AAAA");
						return res.end(JSON.stringify({status : 'not ok', error : 'Message integrity check failed'}))
					}
				}

				let entries = JSON.parse(body).entry;

				entries.forEach((entry) => {
					let events = entry.messaging;
					events.forEach((event) => {
						// handle inbound messages and echos
						if (event.message) {
							if (event.message.is_echo) {
							} else {
							 botPrepareResponse(event, subjectArray, path, _this)
							}
						}
						// handle postbacks
						if (event.postback) {
							 botPrepareResponse(event, subjectArray, path, _this)
						}
					})
				})
				res.end(JSON.stringify({status : 'OK'}))
			})
			res.end();

		}).listen(8081);


	}

	botPrepareResponse(payload, subjectArray, path, _this){

	console.log(payload);
		/*var dialog = {
			data : {
								'contexts': [
									'shop'
								],
								'lang': 'en',
								'query' : payload.message.text,
								'sessionId' : '12345',
								'timezone' : 'Asia/Istanbul'
							},
			headers : {
				'Authorization' : 'Bearer 327778ba5583490284a126400602a3b0',
				'Content-Type': 'application/json'
			}

		}

		client.post('https://api.dialogflow.com/v1/query?v=20183001', dialog, function(response){
			console.log(response);
			let text = response.result.fulfillment.speech;
			console.log(text);
			this.sendMessage(payload.sender.id,{text}, function(err){
					console.log(err);
			});
		});*/
		var globals = _this.configuration[_this.webhook].global;
		console.log("GLOBALS");
		console.log(globals);
		var wit = {
			data : {
				parameters : {}
			},
			headers : {
				'Authorization' : 'Bearer ' + globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken,
				'Content-Type' : 'application/json'
			}
		};

		var instanceMongoQueries = _this.instanceMongoQueries;

		var bot = _this.bot;
		var listTemplateFunc = _this.listtemplate;
		var carouselTemplateFunc = _this.carousel;
		var quickReplyFunc = _this.quickReply;
		var buttonGenericsFunc = _this.buttonGenerics;
		var attachmentFunc = _this.attachment;
		var setWhiteList = _this.setWhitelist;
		var searchedItem = "";
		if(payload.message){
				if(payload.message.quick_reply){
					searchedItem = payload.message.quick_reply.payload;
				}else{
						searchedItem = payload.message.text;
				}
		}else{
				searchedItem = payload.postback.payload;
		}

			console.log(subjectArray[payload.sender.id]);
			if(subjectArray[payload.sender.id]){
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

							if(maxFirst < globals.threshold){
									client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectArray[payload.sender.id] + ' ' + searchedItem), wit, function(response){
											if(response.entities && response.entities.intent && response.entities.intent.length > 0){
												maxFirst = -1;
												maxValueFirst = '';
												for(var i = 0; i < response.entities.intent.length; i++){
													if(maxFirst < response.entities.intent[i].confidence){
														maxValueFirst = response.entities.intent[i].value;
														maxFirst = response.entities.intent[i].confidence;
													}
												}
												if(maxFirst < globals.threshold){
													var random = Math.floor(Math.random() * (globals.responseList.length - 1));
													var text = globals.responseList[random];
													var transaction = new Date().getTime();
													var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
													var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
													instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
													instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
													objUser.confidenceLevel = maxFirst;
													objUser.intentName = maxValueFirst;
													instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
													_this.sendMessage(payload.sender.id,{text}, function(err){
														 console.log(err);
													});
													return;
												}
												instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'answers', {'key' : maxValueFirst}, function(response){
														if(response.length > 0){
															var transaction = new Date().getTime();
															var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
															var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
															instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
															instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
															var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
															if(total.type == 'listTemplate'){
																var listTemplate = new ListTemplate(total.text);
																_this.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate(),setWhiteList), function(resp){
																	console.log(resp);
																});
															}else if (total.type == 'carousel'){
																	var carousel = new Carousel(total.text);
																	_this.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel(),setWhiteList), function(resp){
																		console.log(resp);
																	});
															}else if (total.type == 'quickReply'){
																	var quickReply = new QuickReply(total.text);
																	_this.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply(),setWhiteList), function(resp){
																		console.log(resp);
																	});
															}else if (total.type == 'genericButtons'){
																	var genericButtons = new GenericButtons(total.text);
																	_this.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons(),setWhiteList), function(resp){
																		console.log(resp);
																	});
															}else if (total.type == 'attachment'){
																	var attachment = new Attachment(total.text);
																	_this.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment(),setWhiteList), function(resp){
																		console.log(resp);
																	});
															}else{
																var text = total.text;
																_this.sendMessage(payload.sender.id,{text}, function(err){
																		console.log(err);
																});
															}
														}else{
															var random = Math.floor(Math.random() * (globals.responseList.length - 1));
															var text = globals.responseList[random];
															var transaction = new Date().getTime();
															var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
															var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
															instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
															instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
															objUser.confidenceLevel = maxFirst;
															objUser.intentName = maxValueFirst;
															instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
															_this.sendMessage(payload.sender.id,{text}, function(err){
																 console.log(err);
															});
														}
												});
											}else{
												var random = Math.floor(Math.random() * (globals.responseList.length - 1));
												var text = globals.responseList[random];
												var transaction = new Date().getTime();
												var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
												var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
												objUser.confidenceLevel = maxFirst;
												objUser.intentName = maxValueFirst;
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
												_this.sendMessage(payload.sender.id,{text}, function(err){
													 console.log(err);
												});
											}
									});
								return;
							}else{
								instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
									if(sResponse.length > 0){
										subjectArray[payload.sender.id] = sResponse[0].subject;
									}
									instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'answers', {'key' :  maxValueFirst}, function(response){
										if(response.length > 0){
												var transaction = new Date().getTime();
												var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
												var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' :  payload.sender.id + '_BOT', 'created_date' : new Date()};
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
												var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
												if(total.type == 'listTemplate'){
													var listTemplate = new ListTemplate(total.text);
													_this.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate(),setWhiteList,_this), function(resp){
														console.log(resp);
													});
												}else if (total.type == 'carousel'){
														var carousel = new Carousel(total.text);
														_this.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel(),setWhiteList,_this), function(resp){
															console.log(resp);
														});
												}else if (total.type == 'quickReply'){
														var quickReply = new QuickReply(total.text);
														_this.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply(),setWhiteList,_this), function(resp){
															console.log(resp);
														});
												}else if (total.type == 'genericButtons'){
														var genericButtons = new GenericButtons(total.text);
														_this.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons(),setWhiteList,_this), function(resp){
															console.log(resp);
														});
												}else if (total.type == 'attachment'){
														var attachment = new Attachment(total.text);
														_this.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment(),setWhiteList,_this), function(resp){
															console.log(resp);
														});
												}else{
													var text = total.text;
													_this.sendMessage(payload.sender.id, {text}, function(err){
															console.log(err);
													});
												}
											}else{
												var random = Math.floor(Math.random() * (globals.responseList.length - 1));
												var text = globals.responseList[random];
												var transaction = new Date().getTime();
												var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
												var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
												objUser.confidenceLevel = maxFirst;
												objUser.intentName = maxValueFirst;
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
												_this.sendMessage(payload.sender.id,{text}, function(err){
													 console.log(err);
												});
											}
									});
								});
							}
					}else{
						client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectArray[payload.sender.id] + ' ' + searchedItem), wit, function(response){
								if(response.entities && response.entities.intent && response.entities.intent.length > 0){
									maxFirst = -1;
									maxValueFirst = '';
									for(var i = 0; i < response.entities.intent.length; i++){
										if(maxFirst < response.entities.intent[i].confidence){
											maxValueFirst = response.entities.intent[i].value;
											maxFirst = response.entities.intent[i].confidence;
										}
									}
									if(maxFirst < globals.threshold){
										var random = Math.floor(Math.random() * (globals.responseList.length - 1));
										var text = globals.responseList[random];
										var transaction = new Date().getTime();
										var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
										var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
										objUser.confidenceLevel = maxFirst;
										objUser.intentName = maxValueFirst;
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
										_this.sendMessage(payload.sender.id,{text}, function(err){
											 console.log(err);
										});
										return;
									}
									instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'answers', {'key' : maxValueFirst}, function(response){
										if(response.length > 0){
											var transaction = new Date().getTime();
													var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
													var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id+'_BOT', 'created_date' : new Date()};
													instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
													instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
													var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
													if(total.type == 'listTemplate'){
														var listTemplate = new ListTemplate(total.text);
														_this.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate(),setWhiteList,_this), function(resp){
															console.log(resp);
														});
													}else if (total.type == 'carousel'){
															var carousel = new Carousel(total.text);
															_this.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel(),setWhiteList,_this), function(resp){
																console.log(resp);
															});
													}else if (total.type == 'quickReply'){
															var quickReply = new QuickReply(total.text);
															_this.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply(),setWhiteList,_this), function(resp){
																console.log(resp);
															});
													}else if (total.type == 'genericButtons'){
															var genericButtons = new GenericButtons(total.text);
															_this.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons(),setWhiteList,_this), function(resp){
																console.log(resp);
															});
													}else if (total.type == 'attachment'){
															var attachment = new Attachment(total.text);
															_this.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment(),setWhiteList,_this), function(resp){
																console.log(resp);
															});
													}else{
														var text = total.text;
														_this.sendMessage(payload.sender.id,{text}, function(err){
																console.log(err);
														});
													}
											}else{
												var random = Math.floor(Math.random() * (globals.responseList.length - 1));
												var text = globals.responseList[random];
												var transaction = new Date().getTime();
												var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
												var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
												objUser.confidenceLevel = maxFirst;
												objUser.intentName = maxValueFirst;
												instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
												_this.sendMessage(payload.sender.id,{text}, function(err){
													 console.log(err);
												});
											}
									});
								}else{
									var random = Math.floor(Math.random() * (globals.responseList.length - 1));
									var text = globals.responseList[random];
									var transaction = new Date().getTime();
									var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
									var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
									instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
									instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
									objUser.confidenceLevel = maxFirst;
									objUser.intentName = maxValueFirst;
									instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
									_this.sendMessage(payload.sender.id,{text}, function(err){
										 console.log(err);
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
						if(maxFirst < globals.threshold){
							var random = Math.floor(Math.random() * (globals.responseList.length - 1));
							var text = globals.responseList[random];
							var transaction = new Date().getTime();
							var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
							var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
							instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
							instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
							objUser.confidenceLevel = maxFirst;
							objUser.intentName = maxValueFirst;
							instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
							_this.sendMessage(payload.sender.id,{text}, function(err){
								 console.log(err);
							});
							return;
						}
						instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
							console.log(sResponse);
							if(sResponse.length > 0){
								subjectArray[payload.sender.id] = sResponse[0].subject;
							}
							instanceMongoQueries.findByQuery(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'answers', {'key' : maxValueFirst}, function(response){
								if(response.length > 0){
										var transaction = new Date().getTime();
										var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
										var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' :  payload.sender.id + '_BOT', 'created_date' : new Date()};
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
										var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
										if(total.type == 'listTemplate'){
											var listTemplate = new ListTemplate(total.text);
											_this.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate(),setWhiteList,_this), function(resp){
												console.log(resp);
											});
										}else if (total.type == 'carousel'){
												var carousel = new Carousel(total.text);
												_this.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel(),setWhiteList,_this), function(resp){
													console.log(resp);
												});
										}else if (total.type == 'quickReply'){
												var quickReply = new QuickReply(total.text);
												_this.sendMessage(payload.sender.id,quickReplyFunc(quickReply.createListQuickReply(),setWhiteList,_this), function(resp){
													console.log(resp);
												});
										}else if (total.type == 'genericButtons'){
												var genericButtons = new GenericButtons(total.text);
												_this.sendMessage(payload.sender.id,buttonGenericsFunc(genericButtons.createGenericButtons(),setWhiteList,_this), function(resp){
													console.log(resp);
												});
										}else if (total.type == 'attachment'){
												var attachment = new Attachment(total.text);
												_this.sendMessage(payload.sender.id,attachmentFunc(attachment.createAttachment(),setWhiteList,_this), function(resp){
													console.log(resp);
												});
										}else{
											var text = total.text;
											_this.sendMessage(payload.sender.id,{text}, function(err){
													console.log(err);
											});
										}
									}else{
										var random = Math.floor(Math.random() * (globals.responseList.length - 1));
										var text = globals.responseList[random];
										var transaction = new Date().getTime();
										var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
										var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
										objUser.confidenceLevel = maxFirst;
										objUser.intentName = maxValueFirst;
										instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
										_this.sendMessage(payload.sender.id,{text}, function(err){
											 console.log(err);
										});
									}
							});
						});
					}else{
						var random = Math.floor(Math.random() * (globals.responseList.length));
						var text = globals.responseList[random];
						var transaction = new Date().getTime();
						var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
						var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
						instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', obj, function(resp, obj){});
						instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'facebook_messages', objUser, function(resp, obj){});
						objUser.confidenceLevel = maxFirst;
						objUser.intentName = maxValueFirst;
						instanceMongoQueries.insertOne(globals[_this.configuration[_this.webhook].authorization].defaultAuthorizationToken, 'training_messages', objUser, function(resp, obj){});
						_this.sendMessage(payload.sender.id,{text}, function(err){
							 console.log(err);
						});
					}
				});
			}
	}

	setWhitelist(url,_this){
		var args = {
    		data : {
				  'setting_type' : 'domain_whitelisting',
				  'whitelisted_domains' : [url],
				  'domain_action_type' : 'add'
					},
		    headers : {'Content-Type' : 'application/json'}
		};
		client.post('https://graph.facebook.com/v2.6/me/thread_settings?access_token=' + _this.configuration[_this.webhook].token, args, function(resp){
			console.log("White List");
			console.log(resp);
		});
	}

	location(loc){
		return {
		    'text' : loc,
		    'quick_replies' : [
		      {
		        'content_type' : 'location'
		      }
		    ]
			};
	}

	quickReply(obj,approve,_this){
		var quickReplyArray = [];
		for(var i = 0; i < obj.quickReplyButtons.length; i++){
				var mainObject = {content_type : obj.quickReplyButtons[i].contentType};
				if(obj.quickReplyButtons[i].title){
					mainObject['title'] = obj.quickReplyButtons[i].title;
				}
				if(obj.quickReplyButtons[i].payload){
					mainObject['payload'] = obj.quickReplyButtons[i].payload;
				}
				if(obj.quickReplyButtons[i].image_url){
					mainObject['image_url'] = obj.quickReplyButtons[i].image_url;
				}
				quickReplyArray.push(mainObject);
		}
		return {
			    'text' : obj.title,
			    'quick_replies' : quickReplyArray
	  };
	}

	attachment(obj,approve,_this){
		var url = '';
		if(obj.elements[0] && obj.elements[0].buttons[0]){
      url = obj.elements[0].buttons[0].url;
		}
		if(url.indexOf('png') != -1 || url.indexOf('jpg') != -1 || url.indexOf('jpeg') != -1){
			return {
				'attachment' : {
					'type' : 'image',
					'payload' : {
						'is_reusable' : false,
						'url' : url
					}
				}
			};
		}else if(url.indexOf('avi') != -1 || url.indexOf('wmv') != -1 || url.indexOf('mov') != -1){
			return {
        'attachment' : {
					'type' : 'video',
					'payload' : {
						'is_reusable' : false,
						'url' : url
					}
				}
			};
		}else{
			return {
        'attachment' : {
					'type' : 'file',
					'payload' : {
						'is_reusable' : false,
						'url' : url
		      }
				}
			};
		}
	}

	buttonGenerics(obj,approve,_this){
		var elements = [];
		for(var i = 0; i < obj.elements.length; i++){
			var mainObject = {title : obj.elements[i].title};
			var buttons = [];
			for(var j = 0; j < obj.elements[i].buttons.length; j++){
				var button = {'type' : obj.elements[i].buttons[j].type};
				button['title']  = obj.elements[i].buttons[j].title;
				if(obj.elements[i].buttons[j].type == 'web_url'){
					button['url'] = obj.elements[i].buttons[j].url;
					approve(obj.elements[i].buttons[j].url,_this);
					button['webview_height_ratio'] = 'full';
					button['messenger_extensions'] =  true;
					button['fallback_url'] = obj.elements[i].buttons[j].url;
					approve(obj.elements[i].buttons[j].url,_this);
				}else{
					console.log(obj.elements[i].buttons[j].payload);
					button['payload'] = obj.elements[i].buttons[j].payload;
				}
				buttons.push(button);
			}
			mainObject['buttons'] = buttons;
			elements.push(mainObject);
		}
		return {
			'attachment' : {
				'type' : 'template',
				'payload' : {
					'template_type' : 'generic',
					'elements' : elements
				}
			}
		};
	}

	carousel(obj,approve,_this){
		let elements = [];
		for(var i = 0; i < obj.elements.length; i++){
			approve(obj.elements[i].default_action.url,_this);
			var mainObject = {
				'title' : obj.elements[i].title,
				'image_url' : obj.elements[i].image_url,
				'subtitle' : obj.elements[i].subtitle,
				'default_action' : {
					'type' : obj.elements[i].default_action.type,
					'url' : obj.elements[i].default_action.url,
					'messenger_extensions' : false,
					'webview_height_ratio' : 'tall'
				}
			};
			var buttons = [];
			for(var j = 0; j < obj.elements[i].buttons.length; j++){
				var button = {'type' : obj.elements[i].buttons[j].type};
				button['title']  = obj.elements[i].buttons[j].title;
				if(obj.elements[i].buttons[j].type == 'web_url'){
					button['url'] = obj.elements[i].buttons[j].url;
					approve(obj.elements[i].buttons[j].url,_this);
					button['webview_height_ratio'] = 'full';
					button['messenger_extensions'] =  true;
					button['fallback_url'] = obj.elements[i].buttons[j].url;
					approve(obj.elements[i].buttons[j].url,_this);
				}else{
					button['payload'] = obj.elements[i].buttons[j].payload;
				}
				console.log(button);
				buttons.push(button);
			}
			mainObject['buttons'] = buttons;
			elements.push(mainObject);
		}
		return {
			'attachment' : {
				'type' : 'template',
				'payload' : {
					'template_type' : 'generic',
					'elements' : elements
				}
			}
		};
	}

	listtemplate(obj,approve,_this){
		let elements = [];
		let mainbutton = [];
		for(var j = 0; j < obj.buttons.length; j++){
			mainbutton.push({
				'type' : obj.buttons[j].type,
				'title' : obj.buttons[j].title,
				'payload' : obj.buttons[j].payload
			});
		}
		for(var i = 0; i < obj.elements.length; i++){
			var mainObject = {
				'title' : obj.elements[i].title,
				'subtitle' : obj.elements[i].subtitle
			};
			if(obj.elements[i].image_url){
				mainObject['image_url'] = obj.elements[i].image_url;
				approve(obj.elements[i].image_url,_this);
			}
			if(obj.elements[i].default_action){
				var default_action = {
						'type' : obj.elements[i].default_action.type,
						'url' : obj.elements[i].default_action.url,
						'messenger_extensions' : false,
						'webview_height_ratio' : 'tall'
					};
					approve(obj.elements[i].default_action.url,_this);
					mainObject['default_action'] = default_action;
			}
			if(obj.elements[i].buttons){
				var buttons = [];
				for(var j = 0; j < obj.elements[i].buttons.length; j++){
					var buttonsObject = {
						'type' : obj.elements[i].buttons[j].type,
						'title' : obj.elements[i].buttons[j].title
					};
					if(obj.elements[i].buttons[j].payload){
						buttonsObject['payload'] = obj.elements[i].buttons[j].payload;
					}
					if(obj.elements[i].buttons[j].url){
						buttonsObject['url'] = obj.elements[i].buttons[j].url;
						approve(obj.elements[i].buttons[j].url,_this);
					}
					if(obj.elements[i].buttons[j].webview_height_ratio){
						buttonsObject['webview_height_ratio'] = obj.elements[i].buttons[j].webview_height_ratio;
					}
					if(obj.elements[i].buttons[j].messenger_extensions){
						buttonsObject['messenger_extensions'] = obj.elements[i].buttons[j].messenger_extensions;
					}
					if(obj.elements[i].buttons[j].fallback_url){
						buttonsObject['fallback_url'] = obj.elements[i].buttons[j].fallback_url;
						approve(obj.elements[i].buttons[j].fallback_url,_this);
					}
					buttons.push(buttonsObject);
				}
				mainObject['buttons'] = buttons;
			}
			elements.push(mainObject);
		}
		return {
			'attachment' : {
				'type' : 'template',
				'payload' : {
					'template_type' : 'list',
					'top_element_style' : 'large',
					'elements' : elements,
					'buttons' : mainbutton
				}
			}
		};
	}

};

module.exports = facebookclass;
