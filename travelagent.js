'use strict';
const { buildRequest, getAllAvailableOptions, qpxRequest, getTicketOptions } = require('./quote.js');
const { elicitSlot, confirmIntent, closeDiag, delegate, buildResponseCard, buildButtons } = require('./lexutils.js');
const { searchChanged, getSearchingOptions, validateBookFlight } = require('./slots.js');
const { postMessage } = require('./slack.js');
const { handleOptions } = require('./options.js');
const { DEBUGLOG } = require('./logger.js');

const bookFlight = (intentRequest, callback) => {
    const source = intentRequest.invocationSource;
    const slots = intentRequest.currentIntent.slots;
    const confirmationStatus = intentRequest.currentIntent.confirmationStatus;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    const analysisMode = intentRequest.inputTranscript.startsWith('analysis ');
    let currentPage = outputSessionAttributes.currentPage || 0;
    let allAvailableOptions = [];

    if (source === 'DialogCodeHook') {
        try {
            const validationResult = validateBookFlight(slots, (JSON.parse(outputSessionAttributes.qslots || '{}')));
            if (!validationResult.isValid) {
                DEBUGLOG(`About to clear ${validationResult.violatedSlot}`);
                slots[`${validationResult.violatedSlot}`] = null;
                callback(elicitSlot({}, intentRequest.currentIntent.name,
                    slots, validationResult.violatedSlot, validationResult.message,
                    validationResult.responseCard));
            } else {
                let confirmationSlot = outputSessionAttributes.confirmationSlot || '';
                if (confirmationSlot === 'Option' && confirmationStatus === 'Denied') {
                    slots.Option = null;
                    slots.DepartureDate = null;
                    confirmationSlot = '';
                    callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'DepartureDate', { contentType: 'PlainText', content: 'No other options on that day,  is there another day which works for you?' },
                        null));
                }
                if (outputSessionAttributes.allAvailableOptions && !searchChanged(JSON.parse(outputSessionAttributes.qslots || '{}'), slots)) { allAvailableOptions = JSON.parse(outputSessionAttributes.allAvailableOptions); }
                if (slots.Option === '99') {
                    slots.Option = null;
                    handleOptions(intentRequest, allAvailableOptions, slots, ++currentPage, callback);
                } else if (slots.Option === '98') {
                    slots.Option = null;
                    slots.DepartureDate = null;
                    slots.ReturnDate = null;
                    callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name, slots, 'DepartureDate', { contentType: 'PlainText', content: `Waht's your new departure date?` },
                        null));
                }

                if (!allAvailableOptions.length) { //availableOptions = getAvailableOptions(slots); 
                    try {
                        postMessage({ 'text': `Getting available options for ${getSearchingOptions(slots)}, it may take a few seconds.` },
                            (res) => {},
                            (err) => { throw err; }
                        );
                        getTicketOptions(buildRequest(slots),
                            (res) => {
                                allAvailableOptions = getAllAvailableOptions(res);
                                handleOptions(intentRequest, allAvailableOptions, slots, currentPage, callback);
                            },
                            (err) => {
                                DEBUGLOG(`External API returned error: ${err}`);
                                callback(delegate(outputSessionAttributes, slots));
                            }
                        );
                    } catch (error) {
                        DEBUGLOG(`Error occurs while calling external API: ${error}`);
                        callback(delegate({ 'allAvailableOptions': JSON.stringify(allAvailableOptions), 'currentPage': currentPage }, slots));
                    }
                };

                if (slots.Option && slots.Option > 0 && slots.Option <= allAvailableOptions.length) {
                    DEBUGLOG(`Option accepted.`);
                    callback(delegate({ 'allAvailableOptions': JSON.stringify(allAvailableOptions), 'currentPage': currentPage }, slots));
                }
            }
        } catch (error) {
            DEBUGLOG(`Error thrown: ${error}`);
            callback(delegate(outputSessionAttributes, slots));
        }
    }

    if (source === 'FulfillmentCodeHook') {
        callback(closeDiag(outputSessionAttributes, 'Fulfilled', {
            contentType: 'PlainText',
            content: analysisMode ? `CALLING REST API TO FUFILL THE BOOKING REQUEST` : `Okay, I have to confess that currently I don't have any contract with the airlines, please goto the airline website to finish your booking. `
        }));
    }
};

// --------------- Intents -----------------------
/**
 * Called when the user specifies an intent for this skill.
 */
const dispatch = (intentRequest, callback) => {
    //DEBUGLOG(JSON.stringify(intentRequest, null, 2));
    const name = intentRequest.currentIntent.name;
    // Dispatch to your skill's intent handlers
    if (name === 'BookFlight') {
        return bookFlight(intentRequest, callback);
    }
    throw new Error(`Intent with name ${name} not supported`);
};

// --------------- Main handler -----------------------
const loggingCallback = (response, originalCallback) => {
    DEBUGLOG(`Full Response: ${JSON.stringify(response, null, 2)}`);
    originalCallback(null, response);
};

// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        DEBUGLOG(`Full Request: ${JSON.stringify(event)}`);

        if (event.bot.name !== 'TravelAgent') {
            callback('Invalid Bot Name');
        }
        dispatch(event, (response) => loggingCallback(response, callback));
    } catch (err) {
        callback(err);
    }
};