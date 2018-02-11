var carousel = class Carousel {
  constructor(list){
    this.list = list;
  }
  createACarousel(imgUrl, title, subtitle, buttons){
    return {"image_url" : imgUrl, "title" : title, "subtitle" : subtitle, "buttons" : buttons}
  }
  createListCarousel(){
    var obj = [];
    for(var i = 0; i < this.list.length; i++){
      obj.push(this.createACarousel(this.list[i].imgUrl, this.list[i].title, this.list[i].subtitle, this.list[i].buttons));
    }
    return obj;
  }
}

module.exports = carousel;
