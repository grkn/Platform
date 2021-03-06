var genericButtons = class GenericButtons {
  constructor(list){
    this.list = list;
  }

  createButtons(array){
    var buttons = [];
    for(var i = 0; i < array.length; i++){
      var aButton = {};
      if(array[i].url && array[i].url != '' ){
        aButton = {'type' : 'web_url', 'url' : array[i].url, 'title' : array[i].name, 'webview_height_ratio' : 'full', 'messenger_extensions' : true, 'fallback_url' : array[i].url};
      }else{
        aButton = {'type' : 'postback', 'title' : array[i].name, 'payload' : array[i].text};
      }
      buttons.push(aButton);
    }
    return buttons;
  }

  createAGenericButtons(text, buttons){
    return {elements : [{'title' : text, 'buttons' : this.createButtons(buttons)}]};
  }

  createGenericButtons(){
    return this.createAGenericButtons(this.list[0].text, this.list[0].buttons);
  }
};

module.exports = genericButtons;
