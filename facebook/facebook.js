const http = require('http')
const Bot = require('messenger-bot')
var Client = require('node-rest-client').Client;
var ListTemplate = require('../views/listTemplate');

var client = new Client();




'use strict'
var facebookclass= class FacebookBotClass {

	constructor(pageId,appId,appSecret,pageToken,verifyToken,globals,firebase) {
        this.bot  = new Bot({
								  token: pageToken,
								  verify: verifyToken,
								  app_secret: appSecret
								});
			this.token = pageToken;
			this.global = globals;
			this.firebase = firebase;
  }

	botListen(){
		this.setWhitelist( ["https://b050986c.eu.ngrok.io"]);
		this.bot.on('error', (err) => {
		  console.log(err.message)
		})

		this.bot.on('message', (payload, reply) => {


			/*var dialog = {
				data : {
							    "contexts": [
							      "shop"
							    ],
							    "lang": "en",
							    "query": payload.message.text,
							    "sessionId": "12345",
							    "timezone": "Asia/Istanbul"
							  },
				headers : {
					"Authorization" : "Bearer 327778ba5583490284a126400602a3b0",
					"Content-Type": "application/json"
				}

			}

			client.post("https://api.dialogflow.com/v1/query?v=20183001",dialog,function(response){
				console.log(response);
				let text = response.result.fulfillment.speech;
				console.log(text);
				reply({text}, function(err){
						console.log(err);
				});
			});*/



/*
		let loc = {title : 'Please send your location'};
		this.bot.sendMessage(payload.sender.id, this.location(loc), function(resp){
		console.log(resp);
	});
*/

/*
			let quick_replies = {title : 'Here is a quick reply options',
				quickReplyButtons : [
					{contentType : 'text', title : 'AAA', payload : 'payload', image_url : 'http://example.com/img'},
					{contentType : 'location'},
					{contentType : 'text', title : 'BBB', payload : 'payload'}
				]};
				this.bot.sendMessage(payload.sender.id, this.quickReply(quick_replies), function(resp){
				console.log(resp);
			});
*/

/*
				let buttonGen = {elements : [
															{title : 'Please choose',
															 buttons:[
															 {type:'postback', title:'AAAA', payload:'aaa'},
															 {type:'postback', title:'BBBBB', payload:'bbb'},
														   {type:'phone_number', title:'Telefon', payload:'phonenumber'}
														 	]}]};
				this.bot.sendMessage(payload.sender.id, this.buttonGenerics(buttonGen), function(resp){
					console.log(resp);
				});
*/

/*
			let carousel = { elements : [
														{	title : 'AAA',
															image_url : 'https://1ed06b63.eu.ngrok.io',
															subtitle : 'aa',
															default_action : {type: 'web_url',url : 'https://1ed06b63.eu.ngrok.io'},
															buttons : [{type:'phone_number',title:'Telefon',payload:'905370277116'},
																				 {type:'postback',title:'Button1',payload:'Dev Payload'},
																				 {type:'postback',title:'Button2',payload:'Dev Payload'}
																			  ]
														}
													 ,{ title : 'BBB',
													 		image_url : 'https://1ed06b63.eu.ngrok.io',
															subtitle : 'bbb',
															default_action : {type: 'web_url',url : 'https://1ed06b63.eu.ngrok.io'},
															buttons : [{type:'postback',title:'Button',payload:'Dev Payload'},
																				 {type:'postback',title:'Button',payload:'Dev Payload'}
																			  ]
														}
													 ,{ title : 'CCC',
													 		image_url : 'https://1ed06b63.eu.ngrok.io',
															subtitle : 'ccc',
														  default_action : {type: 'web_url',url : 'https://1ed06b63.eu.ngrok.io'},
															buttons : [{type:'postback',title:'Button',payload:'Dev Payload'},
																				 {type:'postback',title:'Button',payload:'Dev Payload'}
																			  ]
														}
											 ]
			};
			this.bot.sendMessage(payload.sender.id, this.carousel(carousel), function(resp){
				console.log(resp);
			});
*/

			var wit = {
				data : {
					parameters: {}
				},
				headers : {
					"Authorization" : "Bearer DSWRM5DAQVXBGOH7BQWO455ERSGWRNR6",
					"Content-Type": "application/json"
				}

			}
			var globals = this.global;
			var firebase = this.firebase;
			var bot = this.bot;
			var listTemplateFunc = this.listtemplate;
			client.get("https://api.wit.ai/message?q="+encodeURIComponent(payload.message.text),wit,function(response){

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
		      if(max < globals.threshold){
		        var random = Math.floor(Math.random() * (globals.responseList.length - 1));
						var text = globals.responseList[random];
						reply({text}, function(err){
								console.log(err);
						});
		        return;
		      }

					var ref = firebase.database().ref("/answer");
					ref.once("value", function(snapshot) {
							snapshot.forEach(function(childSnapshot) {
								ref.child('/').child(childSnapshot.key).once('value', function(itemSnapshot) {
									if(itemSnapshot.val().key == maxValue){
										var total = {text : itemSnapshot.val().value, type : itemSnapshot.val().type, intent : itemSnapshot.val().key};
										if(total.type =="listTemplate"){
											var listTemplate = new ListTemplate(total.text);

											bot.sendMessage(payload.sender.id, listTemplateFunc(listTemplate.createListTemplate()), function(resp){
												console.log(resp);
											});
										}else{
											var text= total.type;
											reply({text}, function(err){
													console.log(err);
											});
										}

									}
								});
							});
					});

				}else{
						var random = Math.floor(Math.random() * (globals.responseList.length - 1));
						var text=globals.responseList[random];
					  reply({text}, function(err){
					 		 console.log(err);
					  });
					  return;
				}

			});


/*
		let imagevideo = {url : 'https://1ed06b63.eu.ngrok.io/company_image.png"'};
		this.bot.sendMessage(payload.sender.id, this.imagevideo(imagevideo), function(resp){
			console.log(resp);
		});
		*/

    //
		// let webview = { elements : [
		// 									{
		// 												"title": "Classic T-Shirt Collection",
		// 												"subtitle": "See all our colors",
		// 												"image_url": "https://1ed06b63.eu.ngrok.io/company_image.png",
		// 												"buttons":[
		// 													{
		// 														"type":"postback",
		// 														"title":"Start Something",
		// 														"payload":"DEVELOPER_DEFINED_PAYLOAD"
		// 													}
		// 												]
		// 											},
		// 											{
		// 														"title": "Classic White T-Shirt",
		// 														"subtitle": "See all our colors",
		// 														"default_action": {
		// 															"type": "web_url",
		// 															"url": "https://1ed06b63.eu.ngrok.io/view?item=100",
		// 														}
		// 											},
		// 											{
		// 												"title": "Classic Blue T-Shirt",
		// 												"subtitle": "100% Cotton, 200% Comfortable",
		// 												"image_url": "https://1ed06b63.eu.ngrok.io/company_image.png",
		// 												"buttons":[
		// 													{
		// 														"type":"web_url",
		// 														"url":"https://1ed06b63.eu.ngrok.io",
		// 														"title":"Web View",
		// 														"webview_height_ratio": "full",
		// 														"messenger_extensions": true,
		// 														"fallback_url": "https://1ed06b63.eu.ngrok.io"
		// 														}
		// 												]//yine whitelist e takılacaz ama deneyelim
		// 											}
		// 								 ],
		// 								 buttons : [
		// 										 {
		// 											"title": "View More",
		// 											"type": "postback",
		// 											"payload": "payload"
		// 										}
		// 								 ]
		// };
		// this.bot.sendMessage(payload.sender.id, this.listtemplate(webview), function(resp){
		// 	console.log(resp);
		// });


/*
			//persistent menu
			this.bot.setPersistentMenu ([

						{
							"title":"Pay Bill",
							"type":"postback",
							"payload":"PAYBILL_PAYLOAD"
						},
						{
							"type":"web_url",
							"title":"Latest News",
							"url":"https://www.messenger.com/",
							"webview_height_ratio":"full"
						}
					]
			, function(dt){
				console.log(dt);
			});
*/

/*
// attachments
{
		"attachment":{
			"type":"image",
			"payload":{
				"is_reusable": true,
				"url":"http://www.messenger-rocks.com/image.jpg"
			}
		}
	}
*/

/*
// image / video with button
	{
	    "attachment": {
	      "type": "template",
	      "payload": {
	         "template_type": "media",
	         "elements": [
	            {
	               "media_type": "<image|video>",
	               "url": "<FACEBOOK_URL>"
	            },
							{
					       "media_type": "image",
					       "url": "<MEDIA_URL>",
					       "buttons": [
					          {
					             "type": "web_url",
					             "url": "<WEB_URL>",
					             "title": "View Website",
					          }
					       ]
					    }
	         ]
	      }
	    }
	  }
*/



		})
		http.createServer(this.bot.middleware()).listen(8080)
	}

	setWhitelist(url){
		var args = {
    		data: {
				  "setting_type" : "domain_whitelisting",
				  "whitelisted_domains" : url,
				  "domain_action_type": "add"
					},
		    headers: { "Content-Type": "application/json" }
		};
		client.post("https://graph.facebook.com/v2.6/me/thread_settings?access_token="+this.token,args,function(resp){});
	}

	imagevideo(obj){
		return {
			"attachment":{
				"type":"image",
				"payload":{
					"is_reusable": true,
					"url":obj.url
				}
			}
		}
	}

	location(loc){
		return {
		    "text": loc,
		    "quick_replies":[
		      {
		        "content_type":"location"
		      }
		    ]
			};
	}

	quickReply(obj){
		var quickReplyArray = [];
		for(var i = 0 ; i < obj.quickReplyButtons.length ; i++){
				var mainObject = { content_type : obj.quickReplyButtons[i].contentType};
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
			    "text": obj.title,
			    "quick_replies":quickReplyArray
	  };
	}

	buttonGenerics(obj){
		var elements = [];
		for(var i = 0 ; i < obj.elements.length ; i++){
			var mainObject = { title : obj.elements[i].title};
			var buttons = [];
			for(var j = 0 ; j < obj.elements[i].buttons.length;j++){
				buttons.push({
					"type":obj.elements[i].buttons[j].type,
					"title":obj.elements[i].buttons[j].title,
					"payload":obj.elements[i].buttons[j].payload
				});
			}
			mainObject['buttons'] = buttons;
			elements.push(mainObject);
		}
		return {
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"generic",
					"elements":elements
				}
			}
		}
	}

	carousel(obj){
		let elements = [];
		for(var i = 0; i< obj.elements.length; i++){
			var mainObject = {
				"title":obj.elements[i].title,
				"image_url":obj.elements[i].image_url,
				"subtitle":obj.elements[i].subtitle,
				"default_action": {
					"type": obj.elements[i].default_action.type,
					"url": obj.elements[i].default_action.url,
					"messenger_extensions": false,
					"webview_height_ratio": "tall"
				}
			};
			var buttons = [];
			for(var j = 0 ; j < obj.elements[i].buttons.length; j++){
				buttons.push({
					"type" : obj.elements[i].buttons[j].type,
					"title" : obj.elements[i].buttons[j].title,
					"payload": obj.elements[i].buttons[j].payload
				});
			}
			mainObject["buttons"] = buttons;
			elements.push(mainObject);
		}
		return {
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"generic",
					"elements":elements
				}
			}
		};
	}

	listtemplate(obj){
		let elements = [];
		let mainbutton = [];

		for(var j = 0 ; j < obj.buttons.length; j++){
			mainbutton.push({
				"type" : obj.buttons[j].type,
				"title" : obj.buttons[j].title,
				"payload": obj.buttons[j].payload
			});
		}

		for(var i = 0; i< obj.elements.length; i++){
			var mainObject = {
				"title":obj.elements[i].title,
				"subtitle":obj.elements[i].subtitle,
			};
			if(obj.elements[i].image_url){
				mainObject['image_url'] = obj.elements[i].image_url;
			}
			if(obj.elements[i].default_action){
				var default_action = {
						"type":obj.elements[i].default_action.type,
						"url":obj.elements[i].default_action.url,
						"messenger_extensions":false,
						"webview_height_ratio":"tall",
					}
					mainObject["default_action"] = default_action;
			}

			if(obj.elements[i].buttons){
				var buttons = [];
				for(var j = 0 ; j < obj.elements[i].buttons.length; j++){
					var buttonsObject = {
						"type" : obj.elements[i].buttons[j].type,
						"title" : obj.elements[i].buttons[j].title
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
				mainObject["buttons"] = buttons;
			}
			elements.push(mainObject);
		}
		return {
			"attachment":{
				"type":"template",
				"payload":{
					"template_type":"list",
					"top_element_style": "compact",
					"elements":elements,
					"buttons":mainbutton
				}
			}
		};
	}
};
module.exports = facebookclass;
