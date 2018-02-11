var restify = require('restify');
var builder = require('botbuilder');
var url = require('url');
var fs = require('fs');
var util = require('util');

var skypeClass = class SkypeClass {
  constructor(appId,appPassword){
    this.appId = appId;
    this.appPassword = appPassword;
  }

  botPrepare(){
    var server = restify.createServer();
    server.listen(9001, function () {
       console.log('%s listening to %s', server.name, server.url);
    });

    // Create chat connector for communicating with the Bot Framework Service
    var connector = new builder.ChatConnector({
        appId: this.appId,
        appPassword: this.appPassword
    });

    // Listen for messages from users
    server.post('/api/messages', connector.listen());

    // Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
    var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send('Welcome, here you can see attachment alternatives:');
        builder.Prompts.choice(session, 'What sample option would you like to see?', Options, {
            maxRetries: 3
        });
    },
    function (session, results) {
        var option = results.response ? results.response.entity : Inline;
        switch (option) {
            case Inline:
                return sendInline(session, './images/big-image.png', 'image/png', 'BotFrameworkLogo.png');
            case Upload:
                return uploadFileAndSend(session, './images/big-image.png', 'image/png', 'BotFramework.png');
            case External:
                var url = 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png';
                return sendInternetUrl(session, url, 'image/png', 'BotFrameworkOverview.png');
        }
    }]);

    var Inline = 'Show inline attachment';
    var Upload = 'Show uploaded attachment';
    var External = 'Show Internet attachment';
    var Options = [Inline, Upload, External];

    // Sends attachment inline in base64
    function sendInline(session, filePath, contentType, attachmentFileName) {
        fs.readFile(filePath, function (err, data) {
            if (err) {
                return session.send('Oops. Error reading file.');
            }

            var base64 = Buffer.from(data).toString('base64');

            var msg = new builder.Message(session)
                .addAttachment({
                    contentUrl: util.format('data:%s;base64,%s', contentType, base64),
                    contentType: contentType,
                    name: attachmentFileName
                });

            session.send(msg);
        });
    }

    // Uploads a file using the Connector API and sends attachment
    function uploadFileAndSend(session, filePath, contentType, attachmentFileName) {

        // read file content and upload
        fs.readFile(filePath, function (err, data) {
            if (err) {
                return session.send('Oops. Error reading file.');
            }

            // Upload file data using helper function
            uploadAttachment(
                data,
                contentType,
                attachmentFileName,
                connector,
                connectorApiClient,
                session.message.address.serviceUrl,
                session.message.address.conversation.id)
                .then(function (attachmentUrl) {
                    // Send Message with Attachment obj using returned Url
                    var msg = new builder.Message(session)
                        .addAttachment({
                            contentUrl: attachmentUrl,
                            contentType: contentType,
                            name: attachmentFileName
                        });

                    session.send(msg);
                })
                .catch(function (err) {
                    console.log('Error uploading file', err);
                    session.send('Oops. Error uploading file. ' + err.message);
                });
        });
    }

    // Sends attachment using an Internet url
    function sendInternetUrl(session, url, contentType, attachmentFileName) {
    var msg = new builder.Message(session)
        .addAttachment({
            contentUrl: url,
            contentType: contentType,
            name: attachmentFileName
        });

        session.send(msg);
    }

/* // carousel
    var getCardsAttachments = function(session) {
      return [
          new builder.HeroCard(session)
              .title('Azure Storage')
              .subtitle('Offload the heavy lifting of data center management')
              .text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
              .images([
                  builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/aspnet/aspnet/overview/developing-apps-with-windows-azure/building-real-world-cloud-apps-with-windows-azure/data-storage-options/_static/image5.png')
              ])
              .buttons([
                  builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/storage/', 'Learn More')
              ]),

          new builder.ThumbnailCard(session)
              .title('DocumentDB')
              .subtitle('Blazing fast, planet-scale NoSQL')
              .text('NoSQL service for highly available, globally distributed apps—take full advantage of SQL and JavaScript over document and key-value data without the hassles of on-premises or virtual machine-based cloud database options.')
              .images([
                  builder.CardImage.create(session, 'https://docs.microsoft.com/en-us/azure/documentdb/media/documentdb-introduction/json-database-resources1.png')
              ])
              .buttons([
                  builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/documentdb/', 'Learn More')
              ]),

          new builder.HeroCard(session)
              .title('Azure Functions')
              .subtitle('Process events with a serverless code architecture')
              .text('An event-based serverless compute experience to accelerate your development. It can scale based on demand and you pay only for the resources you consume.')
              .images([
                  builder.CardImage.create(session, 'https://msdnshared.blob.core.windows.net/media/2016/09/fsharp-functions2.png')
              ])
              .buttons([
                  builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/functions/', 'Learn More')
              ]),

          new builder.ThumbnailCard(session)
              .title('Cognitive Services')
              .subtitle('Build powerful intelligence into your applications to enable natural and contextual interactions')
              .text('Enable natural and contextual interaction with tools that augment users\' experiences using the power of machine-based intelligence. Tap into an ever-growing collection of powerful artificial intelligence algorithms for vision, speech, language, and knowledge.')
              .images([
                  builder.CardImage.create(session, 'https://msdnshared.blob.core.windows.net/media/2017/03/Azure-Cognitive-Services-e1489079006258.png')
              ])
              .buttons([
                  builder.CardAction.openUrl(session, 'https://azure.microsoft.com/en-us/services/cognitive-services/', 'Learn More')
              ])
            ];
      }
*/
  }


}

module.exports = skypeClass;
