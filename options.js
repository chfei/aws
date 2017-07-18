'use strict';
const { DEBUGLOG } = require('./logger.js');
const { postMessage } = require('./slack.js');
const { getSearchingOptions } = require('./slots.js');
const { elicitSlot, buildResponseCard, buildButtons } = require('./lexutils.js');

const PAGESIZE = 3;

const getCurrentAvailableOptions = (allAvailableOptions, pageSize, currentPage) => {
    return allAvailableOptions.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
};

module.exports = {
    handleOptions: (intentRequest, allAvailableOptions, slots, currentPage, callback) => {
        const options = JSON.stringify(allAvailableOptions);
        const currentAvailableOptions = getCurrentAvailableOptions(allAvailableOptions, PAGESIZE, currentPage);
        const qslots = JSON.stringify(slots);

        if (!currentAvailableOptions.length) {
            slots.DepartureDate = null;
            callback(elicitSlot({ 'qslots': qslots, 'currentPage': currentPage }, intentRequest.currentIntent.name, slots, 'DepartureDate', { contentType: 'PlainText', content: 'We do not have any availability on that date, is there another day which works for you?' },
                null));
        }
        if (currentAvailableOptions.length >= 1 && !slots.Option) {
            DEBUGLOG(`currentAvailableOptions: ${JSON.stringify(currentAvailableOptions)}`);
            postMessage({
                'text': `Current searching: ${getSearchingOptions(slots)}`,
                'attachments': currentAvailableOptions.map(e => {
                    return {
                        'fallback': e.title,
                        'title': e.title,
                        'text': 'Flight detail information.',
                        'fields': e.fields
                    };
                })
            }, (res) => {
                callback(elicitSlot({ 'allAvailableOptions': options, 'qslots': qslots, 'currentPage': currentPage },
                    intentRequest.currentIntent.name, slots, 'Option', { contentType: 'PlainText', content: `Which option works for you?` },
                    buildResponseCard('Specify Option', 'Please choose an option',
                        null,
                        null,
                        buildButtons(currentAvailableOptions, Math.ceil(allAvailableOptions.length / PAGESIZE) === currentPage + 1)
                    )));
            }, (err) => {
                DEBUGLOG(`Error sending message to slack: ${err}`);
            });
        }
    }
};