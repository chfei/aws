# travel agent lex bot
This is a lambda backend for a flight booking lex bot deployed on Slack.

## To install
This function needs an API key of [QPX Express API](https://developers.google.com/qpx-express/v1/trips/search) to work

1. Setup the lambda function
  *Create a lambda function with latest node.js runtime.
  *Change the handler name to "travelagent.handler".
  *Set the timeout of the function to 30 sec.
  *Zip the entire folder and upload as function package.
2. Follow steps from [Integrating an Amazon Lex Bot with Slack](http://docs.aws.amazon.com/lex/latest/dg/slack-bot-association.html) to create a Slack integration.
3. Create an incoming message webhook on Slack
4. Setup the QPX_API_KEY and SLACK_WEBHOOK_URL form step 3 Environment variables of lambda function
5. Save and test your lambda function.
6. Distribute your customized Slack app to Slack chat.

## To use
Start chatting with the bot on Slack.
* e.g., I would like to book a flight.
* e.g., I would like to book a flight from AKL to LAX.
* e.g., I would like to book a flight from SFO to LAX departs on next Sunday.
* e.g., I would like to book a flight from AKL to PVG departs on next Sunday returns on 12 Sep Economy.
