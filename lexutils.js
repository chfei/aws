'use strict';
// --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------
module.exports = {
    elicitSlot: (sessionAttributes, intentName, slots, slotToElicit, message, responseCard) => {
        return {
            sessionAttributes,
            dialogAction: {
                type: 'ElicitSlot',
                intentName,
                slots,
                slotToElicit,
                message,
                responseCard,
            },
        };
    },

    confirmIntent: (sessionAttributes, intentName, slots, message, responseCard) => {
        return {
            sessionAttributes,
            dialogAction: {
                type: 'ConfirmIntent',
                intentName,
                slots,
                message,
                responseCard,
            },
        };
    },

    closeDiag: (sessionAttributes, fulfillmentState, message, responseCard) => {
        return {
            sessionAttributes,
            dialogAction: {
                type: 'Close',
                fulfillmentState,
                message,
                responseCard,
            },
        };
    },

    delegate: (sessionAttributes, slots) => {
        return {
            sessionAttributes,
            dialogAction: {
                type: 'Delegate',
                slots,
            },
        };
    },

    // Build a responseCard with a title, subtitle, and an optional set of options which should be displayed as buttons.
    buildResponseCard: (title, subTitle, imageUrl, attachmentLinkUrl, options) => {
        let buttons = null;
        if (options != null) {
            buttons = [];
            for (let i = 0; i < Math.min(5, options.length); i++) {
                buttons.push(options[i]);
            }
        }
        return {
            contentType: 'application/vnd.amazonaws.card.generic',
            version: 1,
            genericAttachments: [{
                title,
                subTitle,
                imageUrl,
                attachmentLinkUrl,
                buttons
            }],
        };
    },

    buildButtons: (currentAvailableOptions, lastPage) => {
        let trailer = [{ text: 'Try another date', value: 98 }];
        if (!lastPage) {
            trailer.unshift({ text: 'Show more options', value: 99 });
        }
        return currentAvailableOptions.map(e => {
            return {
                text: e.title,
                value: e.option
            };
        }).concat(trailer);
    }
};