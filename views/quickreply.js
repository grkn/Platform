var quickReply = class QuickReply {
  constructor(list){
    this.list = list;
  }

  createButtons(array){
    var buttons = [];
    for(var i = 0; i < array.length ; i++){
      var aButton = {}
      aButton = {contentType : "text", title : array[i].name,payload : array[i].text};

      buttons.push(aButton);
    }
    return buttons;
  }

  createAQuickReply(text, buttons){
    return {"title" : text, "quickReplyButtons" : this.createButtons(buttons)}
  }
  createListQuickReply(){
    console.log(this.list);
    return this.createAQuickReply(this.list[0].text, this.list[0].buttons);
  }
}

module.exports = quickReply;
/*let quick_replies = {title : 'Here is a quick reply options',
  quickReplyButtons : [
    {contentType : 'text', title : 'AAA', payload : 'payload', image_url : 'http://example.com/img'},
    {contentType : 'location'},
    {contentType : 'text', title : 'BBB', payload : 'payload'}
  ]};*/
