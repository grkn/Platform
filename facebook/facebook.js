const http = require('http')
const Bot = require('messenger-bot')
var Client = require('node-rest-client').Client;
var ListTemplate = require('../views/listTemplate');
var Carousel = require('../views/carousel');
var QuickReply = require('../views/quickReply');
var GenericButtons = require('../views/genericButtons');
var Attachment = require('../views/attachment');

var client = new Client();


'use strict'
var facebookclass= class FacebookBotClass {

	constructor(pageId, appId, appSecret, pageToken, verifyToken, globals, instanceMongoQueries) {
        this.bot  = new Bot({
								  token : pageToken,
								  verify : verifyToken,
								  app_secret : appSecret
								});
			this.token = pageToken;
			this.global = globals;
			this.instanceMongoQueries = instanceMongoQueries;
			if(this.global.persistentMenu){
				var array = [];
				for(var i = 0; i < this.global.persistentMenu.length; i++){
					if(this.global.persistentMenu[i].text.indexOf('http') != -1){
						array.push({title : this.global.persistentMenu[i].name, type : 'web_url', url : this.global.persistentMenu[i].text , 'webview_height_ratio' : 'full'});
					}else{
						array.push({title : this.global.persistentMenu[i].text, type : 'postback', payload : this.global.persistentMenu[i].text });
					}
				}
				//persistent menu
				this.bot.setPersistentMenu (array, function(dt){
					console.log(dt);
				});
			}

  }

	botListen(){
		this.setWhitelist( ['https://b050986c.eu.ngrok.io']);
		this.bot.on('error', (err) => {
		  console.log(err.message)
		})
		var subjectArray = {

		};
		this.bot.on('message', (payload, reply) => {
			console.log(payload.sender.id);

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
				reply({text}, function(err){
						console.log(err);
				});
			});*/


			var wit = {
				data : {
					parameters : {}
				},
				headers : {
					'Authorization' : 'Bearer ' + this.global.defaultAuthorizationToken,
					'Content-Type' : 'application/json'
				}
			}

			var instanceMongoQueries = this.instanceMongoQueries;
			var globals = this.global;
			var bot = this.bot;
			var listTemplateFunc = this.listtemplate;
			var carouselTemplateFunc = this.carousel;
			var quickReplyFunc = this.quickReply;
			var buttonGenericsFunc = this.buttonGenerics;
			var attachmentFunc = this.attachment;


			var searchedItem = payload.message.text;
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

								if(maxFirst < global.threshold){
										client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectArray[payload.sender.id] + " " +searchedItem), wit, function(response){
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
														var transaction = new Date().getTime();
														var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
														var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
														instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
														instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
														objUser.confidenceLevel = maxFirst;
														objUser.intentName = maxValueFirst;
														instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
														reply({text}, function(err){
													 		 console.log(err);
													  });
														return;
													}
													instanceMongoQueries.findByQuery('answers', {'key' : maxValueFirst}, function(response){
															if(response.length > 0){
																var transaction = new Date().getTime();
																var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
																var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
																instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
																instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
																var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
																if(total.type == 'listTemplate'){
																	var listTemplate = new ListTemplate(total.text);
																	bot.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate()), function(resp){
																		console.log(resp);
																	});
																}else if (total.type == 'carousel'){
																		var carousel = new Carousel(total.text);
																		bot.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel()), function(resp){
																			console.log(resp);
																		});
																}else if (total.type == 'quickReply'){
																		var quickReply = new QuickReply(total.text);
																		bot.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply()), function(resp){
																			console.log(resp);
																		});
																}else if (total.type == 'genericButtons'){
																		var genericButtons = new GenericButtons(total.text);
																		bot.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons()), function(resp){
																			console.log(resp);
																		});
																}
																else if (total.type == 'attachment'){
																		var attachment = new Attachment(total.text);
																		bot.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment()), function(resp){
																			console.log(resp);
																		});
																}
																else{
																	var text = total.text;
																	reply({text}, function(err){
																			console.log(err);
																	});
																}
															}else{
																var random = Math.floor(Math.random() * (global.responseList.length - 1));
																var text = global.responseList[random];
																var transaction = new Date().getTime();
																var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
																var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
																instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
																instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
																objUser.confidenceLevel = maxFirst;
																objUser.intentName = maxValueFirst;
																instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
																reply({text}, function(err){
															 		 console.log(err);
															  });
															}
													});
												}
										});
									return;
								}else{
									instanceMongoQueries.findByQuery('subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
										if(sResponse.length > 0){
											subjectArray[payload.sender.id] = sResponse[0].subject;
										}
										instanceMongoQueries.findByQuery('answers', {'key' :  maxValueFirst}, function(response){
											if(response.length > 0){
													var transaction = new Date().getTime();
													var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
													var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' :  payload.sender.id + '_BOT', 'created_date' : new Date()};
													instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
													instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
													var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
													if(total.type == 'listTemplate'){
														var listTemplate = new ListTemplate(total.text);
														bot.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate()), function(resp){
															console.log(resp);
														});
													}else if (total.type == 'carousel'){
															var carousel = new Carousel(total.text);
															bot.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel()), function(resp){
																console.log(resp);
															});
													}else if (total.type == 'quickReply'){
															var quickReply = new QuickReply(total.text);
															bot.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply()), function(resp){
																console.log(resp);
															});
													}else if (total.type == 'genericButtons'){
															var genericButtons = new GenericButtons(total.text);
															bot.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons()), function(resp){
																console.log(resp);
															});
													}
													else if (total.type == 'attachment'){
															var attachment = new Attachment(total.text);
															bot.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment()), function(resp){
																console.log(resp);
															});
													}
													else{
														var text = total.text;
														reply({text}, function(err){
																console.log(err);
														});
													}
												}else{
													var random = Math.floor(Math.random() * (global.responseList.length - 1));
													var text = global.responseList[random];
													var transaction = new Date().getTime();
													var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
													var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
													instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
													instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
													objUser.confidenceLevel = maxFirst;
													objUser.intentName = maxValueFirst;
													instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
													reply({text}, function(err){
												 		 console.log(err);
												  });
												}
										});
									});
								}
						}else{
							client.get('https://api.wit.ai/message?q=' + encodeURIComponent(subjectArray[payload.sender.id] + " " + searchedItem), wit, function(response){
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
											var transaction = new Date().getTime();
											var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
											var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
											instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
											instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
											objUser.confidenceLevel = maxFirst;
											objUser.intentName = maxValueFirst;
											instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
											reply({text}, function(err){
										 		 console.log(err);
										  });
											return;
										}
										instanceMongoQueries.findByQuery('answers', {'key' : maxValueFirst }, function(response){
											if(response.length > 0){
												var transaction = new Date().getTime();
														var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
														var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id+'_BOT', 'created_date' : new Date()};
														instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
														instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
														var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
														if(total.type == 'listTemplate'){
															var listTemplate = new ListTemplate(total.text);
															bot.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate()), function(resp){
																console.log(resp);
															});
														}else if (total.type == 'carousel'){
																var carousel = new Carousel(total.text);
																bot.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel()), function(resp){
																	console.log(resp);
																});
														}else if (total.type == 'quickReply'){
																var quickReply = new QuickReply(total.text);
																bot.sendMessage(payload.sender.id, quickReplyFunc(quickReply.createListQuickReply()), function(resp){
																	console.log(resp);
																});
														}else if (total.type == 'genericButtons'){
																var genericButtons = new GenericButtons(total.text);
																bot.sendMessage(payload.sender.id, buttonGenericsFunc(genericButtons.createGenericButtons()), function(resp){
																	console.log(resp);
																});
														}
														else if (total.type == 'attachment'){
																var attachment = new Attachment(total.text);
																bot.sendMessage(payload.sender.id, attachmentFunc(attachment.createAttachment()), function(resp){
																	console.log(resp);
																});
														}
														else{
															var text = total.text;
															reply({text}, function(err){
																	console.log(err);
															});
														}
												}else{
													var random = Math.floor(Math.random() * (global.responseList.length - 1));
													var text = global.responseList[random];
													var transaction = new Date().getTime();
													var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
													var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
													instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
													instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
													objUser.confidenceLevel = maxFirst;
													objUser.intentName = maxValueFirst;
													instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
													reply({text}, function(err){
												 		 console.log(err);
												  });
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
								var transaction = new Date().getTime();
								var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
								var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
								instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
								instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
								objUser.confidenceLevel = maxFirst;
								objUser.intentName = maxValueFirst;
								instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
								reply({text}, function(err){
							 		 console.log(err);
							  });
								return;
							}
							instanceMongoQueries.findByQuery('subject_intent_relation', {intent : maxValueFirst}, function(sResponse){
								console.log(sResponse);
								if(sResponse.length > 0){
									subjectArray[payload.sender.id] = sResponse[0].subject;
								}
								instanceMongoQueries.findByQuery('answers', {'key' : maxValueFirst}, function(response){
									if(response.length > 0){
											var transaction = new Date().getTime();
											var objUser = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
											var obj = {'transaction' : transaction, 'message' : {text : response[0].value, type : response[0].type, intent : response[0].key}, 'user_id' :  payload.sender.id + '_BOT', 'created_date' : new Date()};
											instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
											instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
											var total = {text : response[0].value, type : response[0].type, intent : response[0].key};
											if(total.type == 'listTemplate'){
												var listTemplate = new ListTemplate(total.text);

												bot.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate()), function(resp){
													console.log(resp);
												});
											}else if (total.type == 'carousel'){
													var carousel = new Carousel(total.text);
													bot.sendMessage(payload.sender.id, carouselTemplateFunc(carousel.createListCarousel()), function(resp){
														console.log(resp);
													});
											}else if (total.type == 'quickReply'){
													var quickReply = new QuickReply(total.text);
													bot.sendMessage(payload.sender.id,quickReplyFunc(quickReply.createListQuickReply()), function(resp){
														console.log(resp);
													});
											}else if (total.type == 'genericButtons'){
													var genericButtons = new GenericButtons(total.text);
													bot.sendMessage(payload.sender.id,buttonGenericsFunc(genericButtons.createGenericButtons()), function(resp){
														console.log(resp);
													});
											}
											else if (total.type == 'attachment'){
													var attachment = new Attachment(total.text);
													bot.sendMessage(payload.sender.id,attachmentFunc(attachment.createAttachment()), function(resp){
														console.log(resp);
													});
											}
											else{
												var text = total.text;
												reply({text}, function(err){
														console.log(err);
												});
											}
										}else{
											var random = Math.floor(Math.random() * (global.responseList.length - 1));
											var text = global.responseList[random];
											var transaction = new Date().getTime();
											var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
											var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
											instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
											instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
											objUser.confidenceLevel = maxFirst;
											objUser.intentName = maxValueFirst;
											instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
											reply({text}, function(err){
										 		 console.log(err);
										  });
										}
								});
							});
						}else{
							var random = Math.floor(Math.random() * (global.responseList.length));
							var text = global.responseList[random];
							var transaction = new Date().getTime();
							var objUser = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id, 'created_date' : new Date()};
							var obj = {'transaction' : transaction, 'message' : {text : text}, 'user_id' : payload.sender.id + '_BOT', 'created_date' : new Date()};
							instanceMongoQueries.insertOne('facebook_messages', obj, function(resp, obj){});
							instanceMongoQueries.insertOne('facebook_messages', objUser, function(resp, obj){});
							objUser.confidenceLevel = maxFirst;
							objUser.intentName = maxValueFirst;
							instanceMongoQueries.insertOne('training_messages', objUser, function(resp, obj){});
							reply({text}, function(err){
						 		 console.log(err);
						  });
						}
					});
				}
		});
		http.createServer(this.bot.middleware()).listen(8081);
	}

	setWhitelist(url){
		var args = {
    		data : {
				  'setting_type' : 'domain_whitelisting',
				  'whitelisted_domains' : url,
				  'domain_action_type' : 'add'
					},
		    headers : {'Content-Type' : 'application/json'}
		};
		client.post('https://graph.facebook.com/v2.6/me/thread_settings?access_token=' + this.token, args, function(resp){});
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

	quickReply(obj){
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

	attachment(obj){
		var url = "";
		if(obj.elements[0] && obj.elements[0].buttons[0]){
      url = obj.elements[0].buttons[0].url;
		}
		if(url.indexOf('png') != -1 || url.indexOf("jpg") != -1 || url.indexOf('jpeg') != -1){
			return {
				'attachment' : {
					'type' : 'image',
					'payload' : {
						'is_reusable' : false,
						'url' : url
					}
				}
			}
		}else if(url.indexOf('avi') != -1 || url.indexOf('wmv') != -1 || url.indexOf('mov') != -1){
			return {
        'attachment' : {
					'type' : 'video',
					'payload' : {
						'is_reusable' : false,
						'url' : url
					}
				}
			}
		}else{
			return {
        'attachment' : {
					'type' : 'file',
					'payload' : {
						'is_reusable' : false,
						'url' : url
		      }
				}
			}
		}
	}

	buttonGenerics(obj){
		var elements = [];
		for(var i = 0; i < obj.elements.length; i++){
			var mainObject = {title : obj.elements[i].title};
			var buttons = [];
			for(var j = 0; j < obj.elements[i].buttons.length; j++){
				var button = {'type' : obj.elements[i].buttons[j].type};
				button['title']  = obj.elements[i].buttons[j].title;
				if(obj.elements[i].buttons[j].type == 'web_url'){
					button['url'] = obj.elements[i].buttons[j].url;
					button['webview_height_ratio'] = 'full';
					button['messenger_extensions'] =  true;
					button['fallback_url'] = obj.elements[i].buttons[j].url;
				}else{
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
		}
	}

	carousel(obj){
		let elements = [];
		for(var i = 0; i< obj.elements.length; i++){
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
					button['webview_height_ratio'] = 'full';
					button['messenger_extensions'] =  true;
					button['fallback_url'] = obj.elements[i].buttons[j].url;
				}else{
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

	listtemplate(obj){
		let elements = [];
		let mainbutton = [];
		for(var j = 0; j < obj.buttons.length; j++){
			mainbutton.push({
				'type' : obj.buttons[j].type,
				'title' : obj.buttons[j].title,
				'payload' : obj.buttons[j].payload
			});
		}
		for(var i = 0; i< obj.elements.length; i++){
			var mainObject = {
				'title' : obj.elements[i].title,
				'subtitle' : obj.elements[i].subtitle
			};
			if(obj.elements[i].image_url){
				mainObject['image_url'] = obj.elements[i].image_url;
			}
			if(obj.elements[i].default_action){
				var default_action = {
						'type' : obj.elements[i].default_action.type,
						'url' : obj.elements[i].default_action.url,
						'messenger_extensions' : false,
						'webview_height_ratio' : 'tall'
					}
					mainObject['default_action'] = default_action;
			}
			if(obj.elements[i].buttons){
				var buttons = [];
				for(var j = 0; j < obj.elements[i].buttons.length; j++){
					var buttonsObject = {
						'type' : obj.elements[i].buttons[j].type,
						'title' : obj.elements[i].buttons[j].title
					}
					if(obj.elements[i].buttons[j].payload){
						buttonsObject['payload'] = obj.elements[i].buttons[j].payload;
					}
					if(obj.elements[i].buttons[j].url){
						buttonsObject['url'] = obj.elements[i].buttons[j].url;
					}
					if(obj.elements[i].buttons[j].webview_height_ratio){
						buttonsObject['webview_height_ratio'] = obj.elements[i].buttons[j].webview_height_ratio;
					}
					if(obj.elements[i].buttons[j].messenger_extensions){
						buttonsObject['messenger_extensions'] = obj.elements[i].buttons[j].messenger_extensions;
					}
					if(obj.elements[i].buttons[j].fallback_url){
						buttonsObject['fallback_url'] = obj.elements[i].buttons[j].fallback_url;
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
