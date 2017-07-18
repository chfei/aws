'use strict';
const LOGGERON = 1;

const logger = namespace => {
    return LOGGERON ? console.log.bind(console, namespace) : e => {};
};

module.exports = {
    DEBUGLOG: logger('***DEBUG***')
};