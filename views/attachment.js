var attachment = class Attachment {
  constructor(list){
    this.list = list;
  }

  createAttachmentButton(array){
    var attachments = [];
    for(var i = 0; i < array.length; i++){
      var anAttachment = {};
      if(array[i].url && array[i].url != '' ){
        anAttachment = {'type' : 'web_url', 'url' : array[i].url, 'title' : array[i].name};
      }else{
        anAttachment = {'type' : 'postback', 'title' : array[i].name, 'payload' : array[i].text};
      }
      attachments.push(anAttachment);
    }
    return attachments;
  }

  createAAttachment(text, attachments){
    return {elements : [{'title' : text, 'buttons' : this.createAttachmentButton(attachments)}]};
  }

  createAttachment(){
    return this.createAAttachment(this.list[0].text, this.list[0].buttons);
  }
};

module.exports = attachment;
