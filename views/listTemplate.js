var listTemplate = class ListTemplate {
  constructor(list){
    this.list = list;
  }

  createButtons(array){
    var buttons = [];
    for(var i = 0; i < array.length; i++){
      var aButton = {};
      if(array[i].url){
        aButton = {'type' : 'web_url' , 'url' : array[i].url, 'title' : array[i].name, 'webview_height_ratio' : 'full', 'messenger_extensions' : true, 'fallback_url' : array[i].url};
      }else{
        aButton = {'type' : 'postback', 'title' : array[i].name, 'payload' : array[i].text};
      }
      buttons.push(aButton);
    }
    return buttons;
  }

  createAListTemplate(title, subtitle, imageUrl, buttons){
    return {'title' : title, 'subtitle' : subtitle, 'image_url' : imageUrl, 'buttons' : this.createButtons(buttons)};
  }

  createListTemplate(){
    /*
    "title": "Classic T-Shirt Collection",
    "subtitle": "See all our colors",
    "image_url": "https://peterssendreceiveapp.ngrok.io/img/collection.png",
    */
    var obj = {elements : [], buttons : []};
    for(var i = 0; i < this.list.list.length; i++){
      obj.elements.push(this.createAListTemplate(this.list.list[i].title, this.list.list[i].subTitle, this.list.list[i].imgUrl, this.list.list[i].buttons));
    }
    obj.buttons.push({'type' : 'postback', 'title' : this.list.viewMoreButtonName, 'payload' : this.list.viewMoreButtonUrl});
    return obj;
  }
};

module.exports = listTemplate;
