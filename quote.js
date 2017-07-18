'use strict';
const rp = require('request-promise');
const { DEBUGLOG } = require('./logger.js');
const apiKey = process.env.QPX_API_KEY || '';

const Slice = class {
    constructor(origin, destination, date, preferredCabin, alliance) {
        this.origin = origin;
        this.destination = destination;
        this.date = date;
        this.preferredCabin = preferredCabin;
        this.alliance = alliance;
    }
};

const callback = (res) => {
    DEBUGLOG(`API returned: ${Date.now()}`);
    const options = res.trips.tripOption.reduce((sum, e, i, _) => {
        return sum + (`Option ${i+1}:\n total fare:${e.saleTotal} \n`) + e.slice.reduce((sumslice, sli) => {
            return sumslice + sli.segment.reduce((sumseg, seg) => {
                return sumseg + seg.leg.reduce((sumleg, leg) => {
                    return sumleg + (`${seg.flight.carrier}${seg.flight.number} ${leg.origin}(${leg.departureTime.slice(0,16).replace('T',' ')}) -> ${leg.destination}(${leg.arrivalTime.slice(0,16).replace('T',' ')}), ${Math.round(leg.duration/60)}H, aircraft:${leg.aircraft} \n`);
                }, '');
            }, '');
        }, '');;
    }, '');
    DEBUGLOG(`Reduce completed: ${Date.now()}`);
    DEBUGLOG(options);
};

module.exports = {
    buildRequest: (slots) => {
        let qpxRequest = {
            "request": {
                "slice": [],
                "passengers": {
                    "adultCount": 1,
                    "infantInLapCount": 0,
                    "infantInSeatCount": 0,
                    "childCount": 0,
                    "seniorCount": 0
                },
                "solutions": 10
            }
        };
        qpxRequest.request.slice = [];
        if (slots.TripType === 'round trip') {
            qpxRequest.request.slice.push(new Slice(slots.DepartureCity, slots.DestinationCity, slots.DepartureDate, slots.Cabin, slots.Alliance));
            qpxRequest.request.slice.push(new Slice(slots.DestinationCity, slots.DepartureCity, slots.ReturnDate, slots.Cabin, slots.Alliance));
        } else {
            qpxRequest.request.slice.push(new Slice(slots.DepartureCity, slots.DestinationCity, slots.DepartureDate, slots.Cabin, slots.Alliance));
        }
        qpxRequest.request.passengers.adultCount = slots.Adults;
        qpxRequest.request.passengers.infantInLapCount = slots.Infants;
        qpxRequest.request.passengers.childCount = slots.Children;
        return qpxRequest;
    },

    getAllAvailableOptions: res => {
        let allAvailableOptions = [];
        res.trips.tripOption.reduce((sum, e, i, _) => {
            let summary = [];
            e.slice.reduce((sumslice, sli) => {
                return sumslice + sli.segment.reduce((sumseg, seg) => {
                    return sumseg + seg.leg.reduce((sumleg, leg) => {
                        summary.push({ 'value': `🛫${leg.origin}(${leg.departureTime.slice(0,16).replace('T',' ')})  🛬${leg.destination}(${leg.arrivalTime.slice(0,16).replace('T',' ')}) ✈${seg.flight.carrier}${seg.flight.number} ⏱${Math.round(leg.duration/60)}H \n` });
                    }, '');
                }, '');
            }, '');

            allAvailableOptions.push({
                option: i + 1,
                title: `Option ${i+1}   ${e.saleTotal}`,
                fields: summary
            });
        }, []);
        return allAvailableOptions;
    },

    getTicketOptions: (request, callback, err) => {
        var options = {
            method: 'POST',
            uri: `https://www.googleapis.com/qpxExpress/v1/trips/search?key=${apiKey}&fields=trips(tripOption(saleTotal, slice(segment(flight,leg(origin, departureTime, destination, arrivalTime, duration, aircraft)))))`,
            body: request,
            json: true // Automatically stringifies the body to JSON 
        };

        rp(options)
            .then(callback)
            .catch(err);
    },
};