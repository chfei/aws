'use strict';
const { buildResponseCard } = require('./lexutils.js');
const { DEBUGLOG } = require('./logger.js');

const parseLocalDate = (date) => {
    /**
     * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
     * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
     */
    try {
        const dateComponents = date.split(/\-/);
        const parsedDate = new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
        return (isNaN(parsedDate.getTime())) ? false : parsedDate;
    } catch (err) {
        return false;
    }
};

const buildValidationResult = (isValid, violatedSlot, messageContent, responseCard) => {
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
        responseCard
    };
};

const checkReturnDate = (departureDate, returnDate) => {
    const retDate = parseLocalDate(returnDate);
    if (!retDate) {
        return buildValidationResult(false, 'ReturnDate', `Sorry what's your return date again?`);
    }
    if (departureDate > retDate) {
        return buildValidationResult(false, 'ReturnDate', `The return date can't be eariler than departure date, when will you return?`);
    }
    return retDate;
};

module.exports = {
        validateBookFlight: (slots, preslots) => {
            try {
                if (!slots.DepartureCity) {
                    return buildValidationResult(false, 'DepartureCity', 'Which city are you going to departure from?');
                }

                if (!slots.DestinationCity) {
                    return buildValidationResult(false, 'DestinationCity', 'Which city are you going?');
                }

                if (!slots.DepartureDate) {
                    return buildValidationResult(false, 'DepartureDate', `When are you planning to depart?`);
                }

                const departureDate = parseLocalDate(slots.DepartureDate);
                if (!departureDate) {
                    return buildValidationResult(false, 'DepartureDate', `Sorry what's your departure date again?`);
                }

                if (departureDate < new Date()) {
                    return buildValidationResult(false, 'DepartureDate', `I can't book a trip in past time. What's you new departure date please?`);
                }

                //Let "I would like to book a flight from AKL to LAX departs on next sunday returns on 12 Sep Economy." go. 
                // Auto set trip type for depart date and return date both present
                if (slots.ReturnDate && checkReturnDate(departureDate, slots.ReturnDate)) slots.TripType = 'round trip';

                if (!slots.TripType) {
                    // TODO: need investigate 
                    // A workaround of the wired behavior. Seems lex set the trip type to null when elicit options
                    if (!preslots.TripType) {
                        return buildValidationResult(
                            false,
                            'TripType',
                            'Are you travelling one way or round trip?',
                            buildResponseCard('Trip Type',
                                'Please choose',
                                null,
                                null, [
                                    { text: 'One Way', value: 'one way' },
                                    { text: 'Round Trip', value: 'round trip' }
                                ]));
                    } else {
                        DEBUGLOG(`Setting slots.TripType to pre value ${preslots.TripType}`);
                        slots.TripType = preslots.TripType;
                    }
                }

                if (slots.TripType.toLowerCase() === 'round trip' || slots.TripType.toLowerCase() === 'return') {
                    slots.TripType = 'round trip';
                    if (!slots.ReturnDate) { return buildValidationResult(false, 'ReturnDate', 'When will you return?'); }
                    checkReturnDate(departureDate, slots.ReturnDate);
                } else {
                    slots.TripType = 'one way';
                }

                if (!slots.Cabin) {
                    return buildValidationResult(false, 'Cabin', 'Which class are you flying?', buildResponseCard('Service Class',
                        'Which class are you flying?',
                        'https://s3.amazonaws.com/cnn996/static/img/seats.jpg',
                        null, [
                            { text: 'Economy', value: 'economy' },
                            { text: 'Premium Economy', value: 'premium economy' },
                            { text: 'Business', value: 'business' },
                            { text: 'First Class', value: 'first class' }
                        ]));
                }

                if (!slots.Adults) {
                    return buildValidationResult(false, 'Adults', 'How many adults passengers?', buildResponseCard('How many adults',
                        'How many adults are travelling including youself(upto 4 adults)?',
                        null,
                        null, [
                            { text: '1 adult', value: 1 },
                            { text: '2 adults', value: 2 },
                            { text: '3 adults', value: 3 },
                            { text: '4 adults', value: 4 }
                        ]));
                }

                if (slots.Infants === null) {
                    return buildValidationResult(false, 'Infants', 'Any infants travelling with you?', buildResponseCard('Infants ',
                        'Any infants will travel with you(upto 2 infants)?',
                        null,
                        null, [
                            { text: 'No infants', value: 0 },
                            { text: '1 infant', value: 1 },
                            { text: '2 infants', value: 2 }
                        ]));
                }

                if (slots.Children === null) {
                    return buildValidationResult(false, 'Children', 'Any children travelling with you?', buildResponseCard('Children ',
                        'Any children will travel with you(upto 6 children)?',
                        null,
                        null, [
                            { text: 'No children', value: 0 },
                            { text: '1 children', value: 1 },
                            { text: '2 children', value: 2 },
                            { text: '3 children', value: 3 },
                            { text: '4 children', value: 4 },
                            { text: '5 children', value: 5 },
                            { text: '6 children', value: 6 }
                        ]));
                }

                if (!slots.Alliance) {
                    // TODO: need investigate 
                    if (!preslots.Alliance) {
                        return buildValidationResult(false, 'Alliance', 'Any preferred alliance?', buildResponseCard('Alliance ',
                            'Do you have any preferred alliance?',
                            'https://s3.amazonaws.com/cnn996/static/img/all-airline-alliances.jpg',
                            'https://en.wikipedia.org/wiki/Airline_alliance', [
                                { text: 'oneworld', value: 'oneworld' },
                                { text: 'Star', value: 'Star' },
                                { text: 'SkyTeam', value: 'SkyTeam' },
                                { text: 'Anyone is fine for me.', value: 'any' }
                            ]));
                    } else {
                        DEBUGLOG(`Setting slots.Alliance to pre value ${preslots.Alliance}`);
                        slots.Alliance = preslots.Alliance;
                    }
                }
            } catch (error) {
                DEBUGLOG(`Error thorwn while verifying the input: ${error}`);
                return buildValidationResult(false, 'DepartureCity', 'Which city are you going to departure from?');
            }
            return buildValidationResult(true, null, null);
        },

        getSearchingOptions: (slots) => {
                return `${slots.DepartureCity}​ to ​${slots.DestinationCity}​ departing on ${slots.DepartureDate}${slots.TripType==='round trip'? ` returning on ${slots.ReturnDate}`:` one way`}​ ​${slots.Cabin}​ ${slots.Adults}​ adults${slots.Infants!=0?` ${slots.Infants} infants`:''}${slots.Children!=0?` ${slots.Children} child(ren)`:''} ${slots.Alliance!=='any'?`${slots.Alliance}`:''}`;
        },

        searchChanged: (pre, curr) => {
            return (pre.DepartureDate !== curr.DepartureDate || pre.DepartureCity !== curr.DepartureCity || pre.DestinationCity !== curr.DestinationCity || pre.TripType !== curr.TripType || pre.ReturnDate !== curr.ReturnDate);
        }
};