'use strict';
const rp = require('request-promise');
const { DEBUGLOG } = require('./logger.js');

const uri = process.env.SLACK_WEBHOOK_URL || '';

module.exports = {
    postMessage: (message, callback, err) => {
        var options = {
            method: 'POST',
            uri: uri,
            body: message,
            json: true // Automatically stringifies the body to JSON 
        };
        rp(options)
            .then(callback)
            .catch(err);
    }
};