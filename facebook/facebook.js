const http = require('http')
const Bot = require('messenger-bot')
var Client = require('node-rest-client').Client;
var ListTemplate = require('../views/listTemplate');
var Carousel = require('../views/carousel');
var QuickReply = require('../views/quickReply');
var GenericButtons = require('../views/genericButtons');

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
  }

	botListen(){
		this.setWhitelist( ['https://b050986c.eu.ngrok.io']);
		this.bot.on('error', (err) => {
		  console.log(err.message)
		})

		this.bot.on('message', (payload, reply) => {


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
			client.get('https://api.wit.ai/message?q=' + encodeURIComponent(payload.message.text), wit, function(response){

				if(response.entities && response.entities.intent && response.entities.intent.length > 0){
					var max = -1;
		      var maxValue = '';
		      for(var i = 0; i < response.entities.intent.length; i++){
		        if(max < response.entities.intent[i].confidence ){
		          maxValue = response.entities.intent[i].value;
		          max = response.entities.intent[i].confidence;
		        }
		      }
		      //max configdence sahip intent i bulamadıysam
		      if(max < globals.threshold){
		        var random = Math.floor(Math.random() * (globals.responseList.length - 1));
						var text = globals.responseList[random];
						reply({text}, function(err){
								console.log(err);
						});
		        return;
		      }

					instanceMongoQueries.findByQuery('answers', {key :  maxValue}, function(response){
						if(response.length > 0){
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
									bot.sendMessage(payload.sender.id,quickReplyFunc(quickReply.createListQuickReply()) , function(resp){
										console.log(resp);
									});

							}else if (total.type == 'genericButtons'){
									var genericButtons = new GenericButtons(total.text);
									bot.sendMessage(payload.sender.id,buttonGenericsFunc(genericButtons.createGenericButtons()) , function(resp){
										console.log(resp);
									});

							}else{
								var text= total.type;
								reply({text}, function(err){
										console.log(err);
								});
							}
						}else{
							var random = Math.floor(Math.random() * (globals.responseList.length - 1));
							var text = globals.responseList[random];
						  reply({text}, function(err){
						 		 console.log(err);
						  });
						}
					});
				}else{
						var random = Math.floor(Math.random() * (globals.responseList.length - 1));
						var text = globals.responseList[random];
					  reply({text}, function(err){
					 		 console.log(err);
					  });
					  return;
				}
			});
		})
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

	imagevideo(obj){
		return {
			'attachment': {
				'type' : 'image',
				'payload' : {
					'is_reusable' : true,
					'url' : obj.url
				}
			}
		}
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

	buttonGenerics(obj){
		var elements = [];
		for(var i = 0; i < obj.elements.length; i++){
			var mainObject = {title : obj.elements[i].title};
			var buttons = [];
			for(var j = 0; j < obj.elements[i].buttons.length; j++){
				var button = {
					'type' : obj.elements[i].buttons[j].type,
				};
				button['title']  = obj.elements[i].buttons[j].title;
				if(obj.elements[i].buttons[j].type == 'web_url'){
					button['url'] = obj.elements[i].buttons[j].url,
					button['webview_height_ratio'] = 'full',
					button['messenger_extensions'] =  true,
					button['fallback_url'] =  obj.elements[i].buttons[j].url;
				}else{
					button['payload'] =  obj.elements[i].buttons[j].payload;
				}
				buttons.push(button);
			}
			mainObject['buttons'] = buttons;
			elements.push(mainObject);
		}
		return {
			'attachment': {
				'type' : 'template',
				'payload' : {
					'template_type': 'generic',
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
					button['url'] = obj.elements[i].buttons[j].url,
					button['webview_height_ratio'] = 'full',
					button['messenger_extensions'] =  true,
					button['fallback_url'] =  obj.elements[i].buttons[j].url;
				}else{
					button['payload'] =  obj.elements[i].buttons[j].payload;
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
				'subtitle' : obj.elements[i].subtitle,
			};
			if(obj.elements[i].image_url){
				mainObject['image_url'] = obj.elements[i].image_url;
			}
			if(obj.elements[i].default_action){
				var default_action = {
						'type' : obj.elements[i].default_action.type,
						'url' : obj.elements[i].default_action.url,
						'messenger_extensions' : false,
						'webview_height_ratio' : 'tall',
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
			'attachment': {
				'type' : 'template',
				'payload' : {
					'template_type': 'list',
					'top_element_style' : 'compact',
					'elements' : elements,
					'buttons' : mainbutton
				}
			}
		};
	}

};

module.exports = facebookclass;
