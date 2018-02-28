var carousel = class Carousel {
  constructor(list){
    this.list = list;
  }

  createButtons(array){
    var buttons = [];
    for(var i = 0; i < array.length ; i++){
      var aButton = {}
      if(array[i].url){
        aButton = {'type' : 'web_url', 'url' : 'https://b050986c.eu.ngrok.io/', 'title' : array[i].name};
      }else{
        aButton = {'type' : 'postback', 'title' : array[i].name, 'payload' : array[i].text};
      }
      buttons.push(aButton);
    }
    return buttons;
  }

  createACarousel(imgUrl, title, subtitle, buttons){
    return {'image_url' : imgUrl, 'title' : title, 'subtitle' : subtitle, default_action : {'type' : 'web_url', "url":"https://b050986c.eu.ngrok.io"}, 'buttons' : this.createButtons(buttons)}
  }
  createListCarousel(){
    var obj = {elements : []};
    for(var i = 0; i < this.list.length; i++){
      obj.elements.push(this.createACarousel(this.list[i].imgUrl, this.list[i].title, this.list[i].subtitle, this.list[i].buttons));
    }
    return obj;
  }
}

module.exports = carousel;
