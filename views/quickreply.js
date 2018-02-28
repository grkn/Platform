var quickReply = class QuickReply {
  constructor(list){
    this.list = list;
  }

  createButtons(array){
    var buttons = [];
    for(var i = 0; i < array.length; i++){
      var aButton = {}
      aButton = {"contentType" : 'text', 'title' : array[i].name, 'payload' : array[i].text};

      buttons.push(aButton);
    }
    return buttons;
  }

  createAQuickReply(text, buttons){
    return {'title' : text, 'quickReplyButtons' : this.createButtons(buttons)}
  }
  createListQuickReply(){
    return this.createAQuickReply(this.list[0].text, this.list[0].buttons);
  }
}

module.exports = quickReply;
