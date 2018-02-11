Vue.component('i18n_custom',{
	template : '<select v-model="lang" v-on:change="changeLanguage">'
	+'<option value="en">{{ $t("message.english") }}</option>'
	+'<option value="tr">{{ $t("message.turkish") }}</option>'
	+'</select>',
	methods : {
		changeLanguage : function(){
			window.localStorage.setItem("lang", this.lang);
			window.location.reload();
		}
	},
	data : function(){
		return {lang : window.localStorage.getItem('lang')};
	}
});


if(!window.localStorage.getItem("lang"))
		window.localStorage.setItem("lang", "tr");

var i18n = new VueI18n({
  locale: window.localStorage.getItem("lang"), // set locale
  messages:messages // set locale messages
});

// Intent silme, cumle ekleme, cumle silme
Vue.component('intent',{
	template :'<div class="col-sm-6 col-md-4">'
							+'<div class="thumbnail">'
							  +'<div class="caption">'
									+'<div><span style="float:right;cursor:pointer;" v-on:click="removeIntent">X</span></div>'
									+'<h3> {{value}} </h3>'
									+'<p><input type="text" v-model="sentence"></p>'
									+'<p><label>{{$t("message.storedSentence")}} : </label>'
									+'<div><select v-model="expression"><option v-for="exp in expressions">{{ exp }}</option></select></div>'
									+'</p>'
									+'<p>'
										+'<a class="btn btn-info" role="button" v-on:click="removeSentece(value)">{{$t("message.remove")}}</a>'
										+'<a class="btn btn-default" role="button" v-on:click="addSentence(value)">{{$t("message.add")}}</a>'
									+'</p>'
							  +'</div>'
							+'</div>'
				  	+'</div>',
	props: ['value', 'index', 'expressions'],
	methods : {
		addSentence : function(id){
			console.log(id);
			if(this.sentence.trim() != ""){
					this.expressions.unshift(this.sentence);
					this.sentence = "";
					Vue.http.post("/post/intent/expressions", {value : this.value ,expressions:this.expressions}).then(function(resp){

					});
			}
		},
		removeSentece : function(id){
			if(this.expression.trim() != ""){
				var index = this.expressions.indexOf(this.expression);
				this.expressions.splice(index,1);
				Vue.http.delete("/delete/intent/expressions", {value : this.value, expression : this.expression}).then(function(resp){

				});
			}
		},
		removeIntent : function(){
			Vue.http.delete("/delete/intent", {value : this.value}).then(function(resp){
				window.location.reload();
			});
		}
	},
	data :	function () {
		return {sentence : "", expression : ""}
	}
});

// Intent row template
Vue.component('row',{
	template : '<div class="row"> <intent v-for="(intent,index) in array" v-bind:value="intent.value" v-bind:expressions="intent.expressions" v-bind:index="index" :key="intent.value"></intent></div>',
	props: ['array']
});

// Intent Sayfasi
var container = Vue.component('container',{
	template:'<div class="container">'
						+'<div class="header">'
							+'<div class="page-header">'
								+'<div style="text-align:center">'
									+'<h1>{{$t("message.header")}}</h1>'
								+'</div>'
								+'<span>'
									+'<router-link :to="{ name: \'home\'}">{{$t("message.home")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'answersContainer\'}">{{$t("message.answers")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'trainingContainer\'}">{{$t("message.training")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'facebookContainer\'}">Facebook</router-link>&nbsp;&nbsp;'
								+'</span>'
								+'<span style="float:right">'
									+'<i18n_custom></i18n_custom>'
								+'</span>'
							+'</div> <!--page-header-->'
						+'</div> <!--header-->'
						+'<div class="content">'
							+'<div style="margin-left:20%;width:80%;margin-bottom:4%">'
								+'<label>{{$t("message.search")}}</label><input type="text" v-model="searchText" v-on:keyup="search"/>'
								+'<div style="float:right;"><label>{{$t("message.createLabel")}} :</label>&nbsp;'
									+'<input type="text" v-model="intentName"/>&nbsp;&nbsp;'
									+'<button type="button" class="btn btn-info" v-on:click="createIntent">{{$t("message.create")}}</button>'
								+'</div>'
							+'</div>'
							+'<div class="col-md-2">'
								+'<ul v-for="intent in this.original"><li v-for="i in intent"><span style="cursor:pointer;" v-on:click="showOnlyThisItem(i)">{{i.value}}</span></li></ul>'
							+'</div>'
							+'<div class="col-md-10">'
								+'<row v-for="intentArray in this.intentList" v-bind:array="intentArray"></row>'
						+'</div>'
					+'</div> <!--content-->'
				+'</div> <!--container-->',
	methods : {
		showOnlyThisItem : function(intent){
			this.intentList = [[intent]];
		},
		createIntent : function(){
			if(this.intentName.trim() != ""){
					Vue.http.post("/create/intent", {value : this.intentName }).then(function(resp){
							window.location.reload();
					});
			}
		},
		search : function(){
			if(this.searchText.trim() == ""){
				this.immutableObjectToEntity();
				return;
			}
			this.immutableObjectToEntity();
			for(var i = 0; i < this.original.length; i++){
				for(var j = 0; j < this.original[i].length; j++){
					if(this.original[i][j].value.toLocaleUpperCase().indexOf(this.searchText.toLocaleUpperCase()) < 0){
						var k = 0;
						for(k = 0; k < this.intentList.length; k++){
							var z = 0;
							var flag = false;
							for(z = 0; z < this.intentList[k].length; z++){
								if(this.intentList[k][z].value == this.original[i][j].value){
									flag = true;
									break;
								}
							}
							if(flag){
								this.intentList[k].splice(z,1);
							}
						}
					}
				}
			}
		},
		immutableObjectToOriginal: function(){
			for(var i = 0; i < this.intentList.length ;i++){
				var mod3Array = [];
				for(var j = 0; j < this.intentList[i].length;j++){
					var obj = {};
					for(var key in this.intentList[i][j]){
						obj[key] = this.intentList[i][j][key];
					}
					mod3Array = mod3Array.concat(obj);
				}
				this.original.push(mod3Array);
			}
		},
		immutableObjectToEntity: function(){
			this.intentList = [];
			for(var i = 0; i < this.original.length ;i++){
				var mod3Array = [];
				for(var j = 0; j < this.original[i].length;j++){
					var obj = {};
					for(var key in this.original[i][j]){
						obj[key] = this.original[i][j][key];
					}
					mod3Array = mod3Array.concat(obj);
				}
				this.intentList.push(mod3Array);
			}
		},
		mountFunc : function(iList,func){
			Vue.http.get("/get/witai/entities").then(function(resp){
				  var counter = 0;
					var index = -1;
					for(var i = 0; i < resp.data.values.length; i++){
						if(counter % 3 == 0){
							index++;
							iList[index] = [];
						}
						iList[index].push(resp.data.values[i]);
						counter++;
					}
					func();
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.mountFunc(this.intentList, this.immutableObjectToOriginal);
	  });
	},
	data :	function () {
		return {intentList :[], original :[],
		searchText : "", intentName : ""}
	}
});

// Carousel popup
Vue.component('carousel_popup',{
	template :'<div id="myModal" class="modal fade" role="dialog">'
							+'<div class="modal-dialog">'
						    +'<div class="modal-content">'
						      +'<div class="modal-header">'
						        +'<button type="button" class="close" data-dismiss="modal">&times;</button>'
						        +'<h4 class="modal-title">Carousel</h4>'
						      +'</div>'
						      +'<div class="modal-body">'
						        +'<div>'
											+'<ul>'
												+'<select v-model="selectedIntent" v-on:change="selectedIntentFunc"><optgroup v-for="intentList in list">'
													+'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option></optgroup>'
												+'</select>'
											+'</ul>'
										+'</div>'
										+'<div>'
											+'<button style="float:right" class="btn btn-info" v-on:click="removeInputFields()">{{$t("message.removeCarousel")}}</button>'
											+'<button style="float:right" class="btn btn-info" v-on:click="incrementInputFields()">{{$t("message.addCarousel")}}</button>'
											+'<div v-for="car in carousel">'
												+'<table style="width:100%">'
													+'<tr><td><label>{{$t("message.image_url")}}</label></td><td><input type="text" v-model="car.imgUrl"/></td></tr>'
													+'<tr><td><label>{{$t("message.title")}}</label></td><td><input type="text" v-model="car.title"/></td></tr>'
													+'<tr><td><label>{{$t("message.subtitle")}}</label></td><td><input type="text" v-model="car.subtitle"/></td></tr>'
												+'</table>'
												+'<button style="float:right" class="btn btn-info" v-on:click="removeButtons(car)">{{$t("message.removeButton")}}</button>'
												+'<button style="float:right" class="btn btn-info" v-on:click="incrementButtons(car)">{{$t("message.addButton")}}</button>'
												+'<div v-for="button in car.buttons">'
													+'<table style="width:100%">'
														+'<tr><td><label>{{$t("message.url")}}</label></td><td><input type="text" v-model="button.url"/></td></tr>'
														+'<tr><td><label>{{$t("message.name")}}</label></td><td><input type="text" v-model="button.name"/></td></tr>'
														+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="button.text"/></td></tr>'
													+'</table>'
													+'<hr/>'
												+'</div><!--button in-->'
												+'<hr/>'
											+'</div><!--car in-->'
										+'</div><!-- -->'
									+'</div><!--modal-body-->'
						      +'<div class="modal-footer">'
						        +'<button type="button" class="btn btn-default" data-dismiss="modal">{{$t("message.close")}}</button>'
										+'<button type="button" class="btn btn-info" v-on:click="save">{{$t("message.save")}}</button>'
						      +'</div>'
						    +'</div><!--modal-content-->'
						+'</div><!--modal-dialog-->'
					+'</div><!--myModal-->',
	props : ['entityList'],
	methods : {
		incrementInputFields : function(){
			if(this.carousel.length < 4){
					this.carousel.push({buttons:[{}]});
			}
		},
		removeInputFields : function(){
			if(this.carousel.length > 1){
				this.carousel.splice(this.carousel.length - 1, 1);
			}
		},
		incrementButtons : function(car){
			if(car.buttons.length < 3){
				car.buttons.push({});
			}
		},
		removeButtons : function(car){
			if(car.buttons.length > 1){
				car.buttons.splice(car.buttons.length -1, 1)
			}
		},
		save : function(){
			Vue.http.post("/view/create/carousel", {obj : this.carousel, intent : this.selectedIntent}, function(resp){

			});
		},
		selectedIntentFunc : function(){
			var carouselTemp = this.carousel;
			Vue.http.post("/view/get/carousel", {intent : this.selectedIntent}, function(resp){
				if(resp.type && resp.type == 'carousel'){
					while(0 < carouselTemp.length){
						carouselTemp.splice(0, 1);
					}
					for(var i = 0; i < resp.value.length; i++){
						carouselTemp.push(resp.value[i]);
					}
				}else{
					while(0 < carouselTemp.length){
						carouselTemp.splice(0, 1);
					}
					carouselTemp.push({buttons:[{}]});
				}
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.list = this.entityList;
  	})
	},
	data :	function () {
		return {list :[], selectedIntent:"", carousel:[{buttons:[{}]}]}
	}
});

// Add carousel
Vue.component('createCarousel',{
	template :'<div style="display:inline-block; padding-right:1%;">'
							+'<button v-on:click="loadPopup" type="button" class="btn btn-info">Carousel</button>'
							+'<carousel_popup v-bind:entityList="entityList"></carousel_popup>'
						+'</div>',
	props : ['entityList'],
	methods : {
		loadPopup : function(){
				$("#myModal").modal();
		}
	}
});

// Quick Reply popup
Vue.component('quickreply_popup',{
	template :'<div id="myModalquickreply" class="modal fade" role="dialog">'
							+'<div class="modal-dialog">'
						    +'<div class="modal-content">'
						      +'<div class="modal-header">'
						        +'<button type="button" class="close" data-dismiss="modal">&times;</button>'
						        +'<h4 class="modal-title">Quick Reply</h4>'
						      +'</div>'
						      +'<div class="modal-body">'
										+'<div><span>{{$t("message.selectIntent")}}</span>&nbsp;&nbsp;'
											 +'<select v-model="selectedIntent" v-on:change="selectedIntentFunc"><optgroup v-for="intentList in list">'
												 +'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option></optgroup>'
											 +'</select>'
									 +'</div>'
									 +'<br/>'
										+'<div>'
											+'<div v-for="qReply in quickReply">'
												+'<table style="width:100%">'
													+'<tr><td><label>{{$t("message.content")}}</label></td><td><textarea v-model="qReply.text"/></td></tr>'
												+'</table>'
												+'<button style="float:right" class="btn btn-info" v-on:click="removeButtons(qReply)">{{$t("message.removeButton")}}</button>'
												+'<button style="float:right" class="btn btn-info" v-on:click="incrementButtons(qReply)">{{$t("message.addButton")}}</button>'
												+'<div v-for="button in qReply.buttons">'
													+'<table style="width:100%">'
														+'<tr><td><label>{{$t("message.name")}}</label></td><td><input type="text" v-model="button.name"/></td></tr>'
														+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="button.text"/></td></tr>'
													+'</table>'
													+'<hr/>'
												+'</div><!--button in-->'
												+'<hr/>'
											+'</div><!--qReply in-->'
										+'</div><!-- -->'
									+'</div><!--modal-body-->'
						      +'<div class="modal-footer">'
						        +'<button type="button" class="btn btn-default" data-dismiss="modal">{{$t("message.close")}}</button>'
										+'<button type="button" class="btn btn-info" v-on:click="save">{{$t("message.save")}}</button>'
						      +'</div>'
						    +'</div><!--modal-content-->'
						+'</div><!--modal-dialog-->'
					+'</div><!--myModal-->',
	props : ['entityList'],
	methods : {
		incrementButtons : function(quickReply){
			if(quickReply.buttons.length < 5){
				quickReply.buttons.push({});
			}
		},
		removeButtons : function(quickReply){
			if(quickReply.buttons.length > 1){
				quickReply.buttons.splice(quickReply.buttons.length -1, 1)
			}
		},
		save : function(){
			Vue.http.post("/view/create/quickReply", {obj : this.quickReply, intent : this.selectedIntent}, function(resp){

			});
		},
		selectedIntentFunc : function(){
			var quickReplyTemp = this.quickReply;
			Vue.http.post("/view/get/quickReply", {intent : this.selectedIntent}, function(resp){
				if(resp.type && resp.type == 'quickReply'){
					while(0 < quickReplyTemp.length){
						quickReplyTemp.splice(0, 1);
					}
					for(var i = 0; i < resp.value.length; i++){
						quickReplyTemp.push(resp.value[i]);
					}
				}else{
					while(0 < quickReplyTemp.length){
						quickReplyTemp.splice(0, 1);
					}
					quickReplyTemp.push({buttons:[{}]});
				}
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.list = this.entityList;
  	})
	},
	data :	function () {
		return {list :[], selectedIntent:"", quickReply:[{buttons:[{}]}]}
	}
});

// Add quick reply
Vue.component('createQuickReply',{
	template :'<div style="display:inline-block; padding-right:1%;">'
							+'<button v-on:click="loadPopup" type="button" class="btn btn-info">Quick Reply</button>'
							+'<quickreply_popup v-bind:entityList="entityList"></quickreply_popup>'
						+'</div>',
	props : ['entityList'],
	methods : {
		loadPopup : function(){
				$("#myModalquickreply").modal();
		}
	}
});

// list Template popup
Vue.component('listTemplate_popup',{
	template :'<div id="myModalListTemplate" class="modal fade" role="dialog">'
							+'<div class="modal-dialog">'
						    +'<div class="modal-content">'
						      +'<div class="modal-header">'
						        +'<button type="button" class="close" data-dismiss="modal">&times;</button>'
						        +'<h4 class="modal-title">List Template</h4>'
						      +'</div>'
						      +'<div class="modal-body">'
						        +'<div><span>{{$t("message.selectIntent")}}</span>&nbsp;&nbsp;'
												+'<select v-model="selectedIntent" v-on:change="selectedIntentFunc"><optgroup v-for="intentList in list">'
													+'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option></optgroup>'
												+'</select>'
										+'</div>'
										+'<br/>'
										+'<div>'
										+'<table style="width:100%">'
											+'<tr><td><label>{{$t("message.viewMoreButtonUrl")}}</label></td><td><input type="text" v-model="listTemplate.viewMoreButtonUrl"/></td></tr>'
											+'<tr><td><label>{{$t("message.viewMoreButtonName")}}</label></td><td><input type="text" v-model="listTemplate.viewMoreButtonName"/></td></tr>'
										+'</table>'
											+'<button style="float:right" class="btn btn-info" v-on:click="removeInputFields()">{{$t("message.removeListItem")}}</button>'
											+'<button style="float:right" class="btn btn-info" v-on:click="incrementInputFields()">{{$t("message.addListItem")}}</button>'
											+'<div v-for="listTemp in listTemplate.list">'
												+'<table style="width:100%">'
													+'<tr><td><label>{{$t("message.title")}}</label></td><td><input type="text" v-model="listTemp.title"/></td></tr>'
													+'<tr><td><label>{{$t("message.subtitle")}}</label></td><td><input type="text" v-model="listTemp.subTitle"/></td></tr>'
													+'<tr><td><label>{{$t("message.image_url")}}</label></td><td><input type="text" v-model="listTemp.imgUrl"/></td></tr>'
												+'</table>'

												+'<button style="float:right" class="btn btn-info" v-on:click="removeButtons(listTemp)">{{$t("message.removeButton")}}</button>'
												+'<button style="float:right" class="btn btn-info" v-on:click="incrementButtons(listTemp)">{{$t("message.addButton")}}</button>'
												+'<div v-for="button in listTemp.buttons">'
													+'<table style="width:100%">'
														+'<tr><td><label>{{$t("message.name")}}</label></td><td><input type="text" v-model="button.name"/></td></tr>'
														+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="button.text"/></td></tr>'
														+'<tr><td><label>{{$t("message.url")}}</label></td><td><input type="text" v-model="button.url"/></td></tr>'
													+'</table>'
													+'<hr/>'
												+'</div><!--button in-->'
												+'<hr/>'
											+'</div><!--car in-->'
										+'</div><!-- -->'
									+'</div><!--modal-body-->'
						      +'<div class="modal-footer">'
						        +'<button type="button" class="btn btn-default" data-dismiss="modal">{{$t("message.close")}}</button>'
										+'<button type="button" class="btn btn-info" v-on:click="save">{{$t("message.save")}}</button>'
						      +'</div>'
						    +'</div><!--modal-content-->'
						+'</div><!--modal-dialog-->'
					+'</div><!--myModal-->',
	props : ['entityList'],
	methods : {
		incrementInputFields : function(){
			if(this.listTemplate.list.length < 4){
					this.listTemplate.list.push({buttons:[{}]});
			}
		},
		removeInputFields : function(){
			if(this.listTemplate.list.length > 1){
				this.listTemplate.list.splice(this.listTemplate.list.length - 1, 1);
			}
		},
		incrementButtons : function(listTemplate){
			if(listTemplate.list.buttons.length < 1){
				listTemplate.list.buttons.push({});
			}
		},
		removeButtons : function(listTemplate){
			if(listTemplate.list.buttons.length > 0){
				listTemplate.list.buttons.splice(listTemplate.list.buttons.length -1, 1)
			}
		},
		save : function(){
			Vue.http.post("/view/create/listTemplate", {obj : this.listTemplate, intent : this.selectedIntent}, function(resp){

			});
		},
		selectedIntentFunc : function(){
			var listTemplate = this.listTemplate;
			Vue.http.post("/view/get/quickReply", {intent : this.selectedIntent}, function(resp){
				if(resp.type && resp.type == 'listTemplate'){
					while(0 < listTemplate.list.length){
						listTemplate.list.splice(0, 1);
					}
					listTemplate.viewMoreButtonUrl = resp.value.viewMoreButtonUrl;
					listTemplate.viewMoreButtonName = resp.value.viewMoreButtonName;
					for(var i = 0; i < resp.value.list.length; i++){
						listTemplate.list.push(resp.value.list[i]);
					}
				}else{
					while(0 < listTemplate.list.length){
						listTemplate.list.splice(0, 1);
					}
					listTemplate.list.push({buttons:[{}]});
					listTemplate.viewMoreButtonUrl = "";
					listTemplate.viewMoreButtonName = "";
				}
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.list = this.entityList;
  	})
	},
	data :	function () {
		return {list :[], selectedIntent:"", listTemplate:{list : [{buttons:[{}]}]}}
	}
});

// Add list Template
Vue.component('createListTemplate',{
	template :'<div style="display:inline-block; padding-right:1%;">'
							+'<button v-on:click="loadPopup" type="button" class="btn btn-info">List Template</button>'
							+'<listTemplate_popup v-bind:entityList="entityList"></listTemplate_popup>'
						+'</div>',
	props : ['entityList'],
	methods : {
		loadPopup : function(){
				$("#myModalListTemplate").modal();
		}
	}
});

// Generic Buttons popup
Vue.component('generic_buttons_popup',{
	template :'<div id="myModalGenericButtons" class="modal fade" role="dialog">'
							+'<div class="modal-dialog">'
						    +'<div class="modal-content">'
						      +'<div class="modal-header">'
						        +'<button type="button" class="close" data-dismiss="modal">&times;</button>'
						        +'<h4 class="modal-title">Generic Buttons</h4>'
						      +'</div>'
						      +'<div class="modal-body">'
						        +'<div><span>{{$t("message.selectIntent")}}</span>&nbsp;&nbsp;'
												+'<select v-model="selectedIntent" v-on:change="selectedIntentFunc"><optgroup v-for="intentList in list">'
													+'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option></optgroup>'
												+'</select>'
										+'</div>'
										+'<br/>'
										+'<div>'
											+'<div v-for="gButtons in genericButtons">'
												+'<table style="width:100%">'
													+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="gButtons.text"/></td></tr>'
												+'</table>'
												+'<button style="float:right" class="btn btn-info" v-on:click="removeButtons(gButtons)">{{$t("message.removeButton")}}</button>'
												+'<button style="float:right" class="btn btn-info" v-on:click="incrementButtons(gButtons)">{{$t("message.addButton")}}</button>'
												+'<div v-for="button in gButtons.buttons">'
													+'<table style="width:100%">'
														+'<tr><td><label>{{$t("message.url")}}</label></td><td><input type="text" v-model="button.url"/></td></tr>'
														+'<tr><td><label>{{$t("message.name")}}</label></td><td><input type="text" v-model="button.name"/></td></tr>'
														+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="button.text"/></td></tr>'
													+'</table>'
													+'<hr/>'
												+'</div><!--button in-->'
												+'<hr/>'
											+'</div><!--gButtons in-->'
										+'</div><!-- -->'
									+'</div><!--modal-body-->'
						      +'<div class="modal-footer">'
						        +'<button type="button" class="btn btn-default" data-dismiss="modal">{{$t("message.close")}}</button>'
										+'<button type="button" class="btn btn-info" v-on:click="save">{{$t("message.save")}}</button>'
						      +'</div>'
						    +'</div><!--modal-content-->'
						+'</div><!--modal-dialog-->'
					+'</div><!--myModal-->',
	props : ['entityList'],
	methods : {
		incrementInputFields : function(){
			if(this.genericButtons.length < 4){
					this.genericButtons.push({buttons:[{}]});
			}
		},
		removeInputFields : function(){
			if(this.genericButtons.length > 1){
				this.genericButtons.splice(this.genericButtons.length - 1, 1);
			}
		},
		incrementButtons : function(gButtons){
			if(gButtons.buttons.length < 3){
				gButtons.buttons.push({});
			}
		},
		removeButtons : function(gButtons){
			if(gButtons.buttons.length > 1){
				gButtons.buttons.splice(gButtons.buttons.length -1, 1)
			}
		},
		save : function(){
			Vue.http.post("/view/create/genericButtons", {obj : this.genericButtons, intent : this.selectedIntent}, function(resp){
			});
		},
		selectedIntentFunc : function(){
			var genericButtons = this.genericButtons;
			Vue.http.post("/view/get/genericButtons", {intent : this.selectedIntent}, function(resp){
				if(resp.type && resp.type == 'genericButtons'){
					while(0 < genericButtons.length){
						genericButtons.splice(0, 1);
					}
					for(var i = 0; i < resp.value.length; i++){
						genericButtons.push(resp.value[i]);
					}
				}else{
					while(0 < genericButtons.length){
						genericButtons.splice(0, 1);
					}
					genericButtons.push({buttons:[{}]});
				}
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.list = this.entityList;
  	})
	},
	data :	function () {
		return {list :[], selectedIntent:"", genericButtons:[{buttons:[{}]}]}
	}
});

// Add Generic Buttons
Vue.component('createGenericButtons',{
	template :'<div style="display:inline-block; padding-right:1%;">'
							+'<button v-on:click="loadPopup" type="button" class="btn btn-info">Generic Buttons</button>'
							+'<generic_buttons_popup v-bind:entityList="entityList"></generic_buttons_popup>'
						+'</div>',
	props : ['entityList'],
	methods : {
		loadPopup : function(){
				$("#myModalGenericButtons").modal();
		}
	}
});

// Attachment popup
Vue.component('attachment_popup',{
	template :'<div id="myModalAttachment" class="modal fade" role="dialog">'
							+'<div class="modal-dialog">'
						    +'<div class="modal-content">'
						      +'<div class="modal-header">'
						        +'<button type="button" class="close" data-dismiss="modal">&times;</button>'
						        +'<h4 class="modal-title">Attachment</h4>'
						      +'</div>'
						      +'<div class="modal-body">'
						        +'<div><span>{{$t("message.selectIntent")}}</span>&nbsp;&nbsp;'
												+'<select v-model="selectedIntent" v-on:change="selectedIntentFunc"><optgroup v-for="intentList in list">'
													+'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option></optgroup>'
												+'</select>'
										+'</div>'
										+'<br/>'
										+'<div>'
											+'<div v-for="atch in genericButtons">'
												+'<table style="width:100%">'
													+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="atch.text"/></td></tr>'
												+'</table>'
												+'<button style="float:right" class="btn btn-info" v-on:click="removeButtons(atch)">{{$t("message.removeAttachment")}}</button>'
												+'<button style="float:right" class="btn btn-info" v-on:click="incrementButtons(atch)">{{$t("message.addAttachment")}}</button>'
												+'<div v-for="button in atch.buttons">'
													+'<table style="width:100%">'
														+'<tr><td><label>{{$t("message.url")}}</label></td><td><input type="text" v-model="button.url"/></td></tr>'
														+'<tr><td><label>{{$t("message.name")}}</label></td><td><input type="text" v-model="button.name"/></td></tr>'
														+'<tr><td><label>{{$t("message.text")}}</label></td><td><input type="text" v-model="button.text"/></td></tr>'
													+'</table>'
													+'<hr/>'
												+'</div><!--button in-->'
												+'<hr/>'
											+'</div><!--atch in-->'
										+'</div><!-- -->'
									+'</div><!--modal-body-->'
						      +'<div class="modal-footer">'
						        +'<button type="button" class="btn btn-default" data-dismiss="modal">{{$t("message.close")}}</button>'
										+'<button type="button" class="btn btn-info" v-on:click="save">{{$t("message.save")}}</button>'
						      +'</div>'
						    +'</div><!--modal-content-->'
						+'</div><!--modal-dialog-->'
					+'</div><!--myModal-->',
	props : ['entityList'],
	methods : {
		incrementInputFields : function(){
			if(this.genericButtons.length < 4){
					this.genericButtons.push({buttons:[{}]});
			}
		},
		removeInputFields : function(){
			if(this.genericButtons.length > 1){
				this.genericButtons.splice(this.genericButtons.length - 1, 1);
			}
		},
		incrementButtons : function(atch){
			if(atch.buttons.length < 3){
				atch.buttons.push({});
			}
		},
		removeButtons : function(atch){
			if(atch.buttons.length > 1){
				atch.buttons.splice(atch.buttons.length -1, 1)
			}
		},
		save : function(){
			Vue.http.post("/view/create/attachment", {obj : this.genericButtons, intent : this.selectedIntent}, function(resp){

			});
		},
		selectedIntentFunc : function(){
			var genericButtons = this.genericButtons;
			Vue.http.post("/view/get/attachment", {intent : this.selectedIntent}, function(resp){
				if(resp.type && resp.type == 'attachment'){
					while(0 < genericButtons.length){
						genericButtons.splice(0, 1);
					}
					for(var i = 0; i < resp.value.length; i++){
						genericButtons.push(resp.value[i]);
					}
				}else{
					while(0 < genericButtons.length){
						genericButtons.splice(0, 1);
					}
					genericButtons.push({buttons:[{}]});
				}
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.list = this.entityList;
  	})
	},
	data :	function () {
		return {list :[], selectedIntent:"", genericButtons:[{buttons:[{}]}]}
	}
});

// Add Attachment
Vue.component('createAttachment',{
	template :'<div style="display:inline-block; padding-right:1%;">'
							+'<button v-on:click="loadPopup" type="button" class="btn btn-info">Attachment</button>'
							+'<attachment_popup v-bind:entityList="entityList"></attachment_popup>'
						+'</div>',
	props : ['entityList'],
	methods : {
		loadPopup : function(){
				$("#myModalAttachment").modal();
		}
	}
});

// Answers cevap ekleme
Vue.component('answers',{
	template :'<div class="col-sm-6 col-md-4">'
							+'<div class="thumbnail">'
						  	+'<div class="caption">'
									+'<h3> {{value}} </h3>'
									+'<p><input type="text" v-model="sentence.value"></p>'
									+'<p><label>{{$t("message.savedAnswer")}} : {{sentence.default}}</label></p>'
									+'<p>'
										+'<a class="btn btn-info" role="button" v-on:click="removeAnswer(value)">{{$t("message.remove")}}</a>'
										+'<a class="btn btn-default" role="button" v-on:click="addAnswer(value)">{{$t("message.add")}}</a>'
									+'</p>'
							  +'</div>'
							+'</div>'
					  +'</div>',
	props: ['value', 'index', 'expressions'],
	methods : {
		addAnswer : function(id){
			if(this.sentence.value.trim() != ""){
				var sentence = this.sentence;
				Vue.http.post("/send/meaningful/sentence", {intent : this.value, message:this.sentence.value}).then(function(resp){
						sentence.default = sentence.value;
						sentence.value = "";
				});
			}
		},
		removeAnswer : function(id){
			if(this.sentence.default.trim() != ""){
				var sentence = this.sentence;
				Vue.http.delete("/delete/meaningful/sentence", {intent : this.value, message:this.sentence.default}).then(function(resp){
						sentence.default = "";
						sentence.value = "";
				});
			}
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			var sentence = this.sentence
			Vue.http.get("/get/meaningful/sentence", {"intent" : this.value.toString()}).then(function(resp){
					if(resp.data.resp != "NOT_FOUND"){
						if(resp.data.type && resp.data.type != 'text'){
							sentence.default = resp.data.type;
						}else{
							sentence.default = resp.data.resp;
						}
					}
			});
	  });
	},
	data :	function () {
		return {sentence : {value : "", default : ""}, expression : ""}
	}
});

// Answers row template
Vue.component('answersRow',{
	template :'<div class="row">'
							+'<answers v-for="(intent,index) in array" v-bind:value="intent.value" v-bind:expressions="intent.expressions" v-bind:index="index" :key="intent.value"></answers>'
						+'</div>',
	props: ['array']
});

// Answers - Cevaplar Sayfasi
var answersContainer = Vue.component("answersContainer",{
	template:'<div class="container">'
						+'<div class="header">'
							+'<div class="page-header">'
								+'<div style="text-align:center">'
									+'<h1>{{$t("message.answerPage")}}</h1>'
								+'</div>'
								+'<span>'
									+'<router-link :to="{ name: \'home\'}">{{$t("message.home")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'answersContainer\'}">{{$t("message.answers")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'trainingContainer\'}">{{$t("message.training")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'facebookContainer\'}">Facebook</router-link>&nbsp;&nbsp;'
								+'</span>'
								+'<span style="float:right">'
									+'<i18n_custom></i18n_custom>'
								+'</span>'
							+'</div> <!--page-header-->'
						+'</div> <!--header-->'
						+'<div class="content">'
							+'<div style="margin-left:20%;width:80%;margin-bottom:4%">'
								+'<createCarousel v-bind:entityList="this.original"></createCarousel>'
								+'<createQuickReply v-bind:entityList="this.original"></createQuickReply>'
								+'<createListTemplate v-bind:entityList="this.original"></createListTemplate>'
								+'<createGenericButtons v-bind:entityList="this.original"></createGenericButtons>'
								+'<createAttachment v-bind:entityList="this.original"></createAttachment>'
							+'</div>'
							+'<div class="col-md-2">'
								+'<ul v-for="intent in this.original"><li v-for="i in intent"><span style="cursor:pointer;" v-on:click="showOnlyThisItem(i)">{{i.value}}</span></li></ul>'
							+'</div>'
							+'<div class="col-md-10">'
								+'<div><label>{{$t("message.search")}}</label><input type="text" v-model="searchText" v-on:keyup="search"/></div>'
								+'<br/><br/>'
								+'<answersRow v-for="intentArray in this.intentList" v-bind:array="intentArray"></answersRow>'
							+'</div>'
						+'</div> <!--content-->'
					+'</div> <!--container-->',
	methods : {
		showOnlyThisItem : function(intent){
			this.intentList = [[intent]];
		},
		search : function(){
			if(this.searchText.trim() == ""){
				this.immutableObjectToEntity();
				return;
			}
			this.immutableObjectToEntity();
			for(var i = 0; i < this.original.length; i++){
				for(var j = 0; j < this.original[i].length; j++){
					if(this.original[i][j].value.toLocaleUpperCase().indexOf(this.searchText.toLocaleUpperCase()) < 0){
						var k = 0 ;
						for(k = 0; k < this.intentList.length; k++){
							var z = 0 ;
							var flag = false;
							for(var z = 0; z < this.intentList[k].length; z++){
								if(this.intentList[k][z].value == this.original[i][j].value){
									flag = true;
									break;
								}
							}
							if(flag){
								this.intentList[k].splice(z,1);
							}
						}
					}
				}
			}
		},
		immutableObjectToOriginal: function(){
			for(var i = 0; i < this.intentList.length; i++){
				var mod3Array = [];
				for(var j = 0; j < this.intentList[i].length; j++){
					var obj = {};
					for(var key in this.intentList[i][j]){
						obj[key] = this.intentList[i][j][key];
					}
					mod3Array = mod3Array.concat(obj);
				}
				this.original.push(mod3Array);
			}
		},
		immutableObjectToEntity: function(){
			this.intentList = [];
			for(var i = 0; i < this.original.length; i++){
				var mod3Array = [];
				for(var j = 0; j < this.original[i].length; j++){
					var obj = {};
					for(var key in this.original[i][j]){
						obj[key] = this.original[i][j][key];
					}
					mod3Array = mod3Array.concat(obj);
				}
				this.intentList.push(mod3Array);
			}
		},
		mountFunc : function(iList,func){
			Vue.http.get("/get/witai/entities").then(function(resp){
				  var counter = 0;
					var index = -1;
					for(var i = 0; i < resp.data.values.length; i++){
						if(counter % 3 == 0){
							index++;
							iList[index] = [];
						}
						iList[index].push(resp.data.values[i]);
						counter++;
					}
					func();
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.mountFunc(this.intentList, this.immutableObjectToOriginal);
	  })
	},
	data :	function () {
		return {intentList :[], original :[],	searchText : ""}
	}
});

// Training sayfasi
var trainingContainer = Vue.component("trainingContainer",{
	template:'<div class="container">'
						+'<div class="header">'
							+'<div class="page-header">'
								+'<div style="text-align:center">'
									+'<h1>{{$t("message.trainingPage")}}</h1>'
								+'</div>'
								+'<span>'
									+'<router-link :to="{ name: \'home\'}">{{$t("message.home")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'answersContainer\'}">{{$t("message.answers")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'trainingContainer\'}">{{$t("message.training")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'facebookContainer\'}">Facebook</router-link>&nbsp;&nbsp;'
								+'</span>'
								+'<span style="float:right">'
									+'<i18n_custom></i18n_custom>'
								+'</span>'
							+'</div> <!--page-header-->'
						+'</div> <!--header-->'
						+'<div class="content">'
							+'<div class="col-md-10">'
								+'<div><label>{{$t("message.threshold")}}</label>&nbsp;&nbsp;&nbsp;<select v-on:change="changeThreshold" v-model="threshold.val"><option value="0.1">0.1</option><option value="0.2">0.2</option>'
								+'<option value="0.3">0.3</option><option value="0.4">0.4</option><option value="0.5">0.5</option><option value="0.6">0.6</option><option value="0.7">0.7</option>'
								+'<option value="0.8">0.8</option><option value="0.9">0.9</option>'
								+'</select>'
								+'&nbsp;&nbsp;&nbsp;<label>{{$t("message.responseList")}}</label>&nbsp;&nbsp;<input type="text" v-model="response"/>'
								+'&nbsp;&nbsp;<button type="button" class="btn btn-info" v-on:click="addDefaultResponse">{{$t("message.add")}}</button>'
								+'&nbsp;&nbsp;<select v-model="selectedResponse"><option v-for="resp in responseList" v-bind:value="resp">{{resp}}</option></select>'
								+'&nbsp;&nbsp;<button type="button" class="btn btn-info" v-on:click="deleteDefaultMessage">{{$t("message.remove")}}</button>'
								+'</div>'
								+'<br/><br/>'
								+'<training v-for="validateText in this.validateTextList" v-bind:array="validateText"></training>'
							+'</div>'
						+'</div> <!--content-->'
					+'</div> <!--container-->',
	methods : {
		changeThreshold : function(){
			Vue.http.get("/change/threshold/"+this.threshold.val).then(function(resp){
			});
		},
		addDefaultResponse : function(){
			this.responseList.push(this.response);
			Vue.http.get("/add/responseList/"+this.response).then(function(resp){
			});
		},
		deleteDefaultMessage : function(){
			if(this.selectedResponse.trim() != ""){
				this.responseList.splice(this.responseList.indexOf(this.selectedResponse),1);
				Vue.http.delete("/add/responseList/"+this.selectedResponse).then(function(resp){
				});
			}
		},
		mountFunc : function(iList){
				Vue.http.get("/mongo/findByLimitTen/training_messages").then(function(resp){
						for(var i = 0; i < resp.data.length; i ++){
							iList.push(resp.data[i]);
						}
				});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			var thresholdTemp = this.threshold;
			var responseListTemp = this.responseList;
			Vue.http.get("/get/threshold/").then(function(resp){
					thresholdTemp.val =resp.data[0].threshold;
					for(var i=0 ; i < resp.data[0].responseList.length;i++){
						responseListTemp.push(resp.data[0].responseList[i]);
					}
			});
			this.mountFunc(this.validateTextList);
	  })
	},
	data :	function () {
		return {validateTextList :[],	threshold :{val : 0.7},responseList :[],response : "",selectedResponse : ""}
	}
});

// Training row içinde
Vue.component('training',{
	template :'<div class="row"><div class="col-md-12">'
							+'<div class="thumbnail">'
						  	+'<div class="caption">'
									+'<h3> {{array.message.text}}</h3>'
									+'<p>'
									+'<select v-model="selectedIntent" >'
										+'<option v-for="intent in intentList" v-bind:value="intent.value">{{intent.value}}</option>'
									+'</select>'
									+'<span style="float:right">{{array.confidenceLevel}}</span>'
									+'</p>'
									+'<p>'
										+'<a class="btn btn-info" role="button" v-on:click="deleteMessage">{{$t("message.removeValidation")}}</a>'
										+'<a class="btn btn-default" role="button"  v-on:click="validate">{{$t("message.addValidation")}}</a>'
									+'</p>'
							  +'</div>'
							+'</div>'
					  +'</div>'
						+'</div>',
	props: ['array'],
	methods : {
		validate : function(){
			Vue.http.post("/witai/validate", {"intent" : this.selectedIntent, "message" : this.array.message.text}).then(function(resp){
				window.location.reload();
			});
		},
		deleteMessage : function(){
			Vue.http.post("/witai/delete", {"message" : this.array.message.text}).then(function(resp){
				window.location.reload();
			});
		}
	},
	mounted : function(){
		this.$nextTick(function () {
			this.selectedIntent = this.array.intentName;
			if(this.array.confidenceLevel)
			this.array.confidenceLevel = Math.round(this.array.confidenceLevel * 1000) / 1000;
				var intentListTemp = this.intentList;
				Vue.http.get("/get/witai/entities").then(function(resp){
						for(var i = 0; i < resp.data.values.length; i++){
							intentListTemp.push(resp.data.values[i]);
						}
				});
	  });
	},
	data :	function () {
		return {sentence : {value : ""}, selectedIntent : "", intentList : []}
	}
});

var facebookContainer = Vue.component("facebookContainer",{
	template:'<div class="container">'
						+'<div class="header">'
							+'<div class="page-header">'
								+'<div style="text-align:center">'
									+'<h1>{{$t("message.trainingPage")}}</h1>'
								+'</div>'
								+'<span>'
									+'<router-link :to="{ name: \'home\'}">{{$t("message.home")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'answersContainer\'}">{{$t("message.answers")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'trainingContainer\'}">{{$t("message.training")}}</router-link>&nbsp;&nbsp;'
									+'<router-link :to="{ name: \'facebookContainer\'}">Facebook</router-link>&nbsp;&nbsp;'
								+'</span>'
								+'<span style="float:right">'
									+'<i18n_custom></i18n_custom>'
								+'</span>'
							+'</div> <!--page-header-->'
						+'</div> <!--header-->'
						+'<div class="content">'
							+'<div class="col-md-10">'
							+'<form class="form-horizontal">'
								+'<div class="form-group">'
									+'<label class="control-label col-sm-2" for="pageId">Page Id:</label>'
									+'<div class="col-sm-10">'
										+'<input type="text" class="form-control" v-model="this.facebookDeployment.values.pageId" id="pageId" placeholder="Page Id">'
									+'</div>'
								+'</div>'
								+'<div class="form-group">'
									+'<label class="control-label col-sm-2" for="appSecret">App Secret:</label>'
									+'<div class="col-sm-10">'
										+'<input type="text" class="form-control" id="appSecret" v-model="facebookDeployment.values.appSecret" placeholder="App Secret">'
									+'</div>'
								+'</div>'
								+'<div class="form-group">'
									+'<label class="control-label col-sm-2" for="accessToken">Access Token:</label>'
									+'<div class="col-sm-10">'
										+'<input type="text" class="form-control" id="accessToken" placeholder="Access Token" v-model="facebookDeployment.values.accessToken">'
									+'</div>'
								+'</div>'
								+'<div class="form-group">'
									+'<label class="control-label col-sm-2" for="verifyToken">Verify Token:</label>'
									+'<div class="col-sm-10">'
										+'<input type="text" class="form-control" id="verifyToken" placeholder="Verify Token" v-model="facebookDeployment.values.verifyToken">'
									+'</div>'
								+'</div>'
								+'<div class="form-group">'
									+'<label class="control-label col-sm-2" for="appId">App Id:</label>'
									+'<div class="col-sm-10">'
										+'<input type="text" class="form-control" id="appId" placeholder="App Id" v-model="facebookDeployment.values.appId">'
									+'</div>'
								+'</div>'
								+'<div class="form-group">'
									+'<div class="col-sm-offset-2 col-sm-10">'
										+'<button type="button" class="btn btn-default" v-on:click="deploy">Deploy</button>'
									+'</div>'
								+'</div>'
							+'</form>'
							+'</div>'
						+'</div> <!--content-->'
					+'</div> <!--container-->',
	methods : {
			deploy : function(){
				Vue.http.post('/facebook/post',{facebookDeployment : this.facebookDeployment.values},function(resp){
				});
			}
	},
	mounted : function(){

		this.$nextTick(function () {
			var facebookTemp = this.facebookDeployment;
				Vue.http.get('/facebook/get',function(resp){
					facebookTemp.values = resp;
				});
	  })
	},
	data :	function () {
		return {facebookDeployment : {values : {}}}
	}
});

// Menu isimleri
var vrouter = new VueRouter({
	routes: [
		{name: 'home', path: '/', component: container},
		{name: 'answersContainer', path: '/answers', component: answersContainer},
		{name: 'trainingContainer', path: '/training', component: trainingContainer},
		{name: 'facebookContainer', path: '/facebookDeployment', component: facebookContainer}
	]
});


var vue = new Vue({
  el: '#app',
  data: {},
  methods : {},
	mounted: function () {
	  this.$nextTick(function () {
	  })
	},
  methods : {},
  router : vrouter,
  i18n : i18n
});
