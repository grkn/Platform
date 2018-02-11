var quickReply = class QuickReply {
  constructor(list){
    this.list = list;
  }
  createAQuickReply(title, subtitle, buttons){
    return {"title" : title, "subtitle" : subtitle, "buttons" : buttons}
  }
  createListQuickReply(){
    var obj = [];
    for(var i = 0; i < this.list.length; i++){
      obj.push(this.createAQuickReply(this.list[i].imgUrl, this.list[i].title, this.list[i].subtitle, this.list[i].buttons));
    }
    return obj;
  }
}

module.exports = quickreply;
