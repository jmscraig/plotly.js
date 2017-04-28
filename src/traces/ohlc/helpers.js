/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/


'use strict';

var Lib = require('../../lib');

// This routine gets called during the trace supply-defaults step.
//
// This is a hacky way to make 'ohlc' and 'candlestick' trace types
// go through the transform machinery.
//
// Note that, we must mutate user data (here traceIn) as opposed
// to full data (here traceOut) as - at the moment - transform
// defaults (which are called after trace defaults) start
// from a clear transforms container. The mutations inflicted are
// cleared in exports.clearEphemeralTransformOpts.
exports.pushDummyTransformOpts = function(traceIn, traceOut) {
    var transformOpts = {

        // give dummy transform the same type as trace
        type: traceOut.type,

        // track ephemeral transforms in user data
        _ephemeral: true
    };

    if(Array.isArray(traceIn.transforms)) {
        traceIn.transforms.push(transformOpts);
    }
    else {
        traceIn.transforms = [transformOpts];
    }
};

// This routine gets called during the transform supply-defaults step
// where it clears ephemeral transform opts in user data
// and effectively put back user date in its pre-supplyDefaults state.
exports.clearEphemeralTransformOpts = function(traceIn) {
    var transformsIn = traceIn.transforms;

    if(!Array.isArray(transformsIn)) return;

    for(var i = 0; i < transformsIn.length; i++) {
        if(transformsIn[i]._ephemeral) transformsIn.splice(i, 1);
    }

    if(transformsIn.length === 0) delete traceIn.transforms;
};

// This routine gets called during the transform supply-defaults step
// where it passes 'ohlc' and 'candlestick' attributes
// (found the transform container via exports.makeTransform)
// to the traceOut container such that they can
// be compatible with filter and groupby transforms.
//
// Note that this routine only has an effect during the
// second round of transform defaults done on generated traces
exports.copyOHLC = function(container, traceOut) {
    if(container.open) traceOut.open = container.open;
    if(container.high) traceOut.high = container.high;
    if(container.low) traceOut.low = container.low;
    if(container.close) traceOut.close = container.close;
};

// This routine gets called during the applyTransform step.
//
// We need to track trace attributes and which direction
// ('increasing' or 'decreasing')
// the generated correspond to for the calcTransform step.
//
// To make sure that the attributes reach the calcTransform,
// store it in the transform opts object.
exports.makeTransform = function(traceIn, state, direction) {
    var out = Lib.extendFlat([], traceIn.transforms);

    out[state.transformIndex] = {
        type: traceIn.type,
        direction: direction,

        // these are copied to traceOut during exports.copyOHLC
        open: traceIn.open,
        high: traceIn.high,
        low: traceIn.low,
        close: traceIn.close
    };

    return out;
};

exports.getFilterFn = function(direction) {

    var fn;
    var isPrevThisDirection = null;
    var oprev = null;
    var cprev = null;

    switch(direction) {
        case 'increasing':
            var fn = function(o, c) {
                if(o === c) {
                    if(c > cprev) {
                        return true; // increasing
                    } else if(c < cprev) {
                        return false; // decreasing
                    } else {
                        if(isPrevThisDirection === true) {
                            return true; // determine by last candle
                        } else if(isPrevThisDirection === false) {
                            return false; // determine by last candle
                        } else {
                            return true; // If we don't have previous data, assume it was increasing
                        }
                    }
                }
                return o < c;
            };
            break;

        case 'decreasing':
            var fn = function(o, c) {
                if(o === c) {
                    if(c > cprev) {
                        return false; // increasing
                    } else if(c < cprev) {
                        return true; // decreasing
                    } else {
                        if(isPrevThisDirection === true) {
                            return true; // determine by last candle
                        } else if(isPrevThisDirection === false) {
                            return false; // determine by last candle
                        } else {
                            return false; // If we don't have previous data, assume it was increasing
                        }
                    }
                }
                return o > c;
            };
            break
    }
    
    return function(o, c) {
        var out = fn(o, c);
        isPrevThisDirection = !!out;
        oprev = o;
        cprev = c;
        return out;
    };

};
exports.addRangeSlider = function(data, layout) {
    var hasOneVisibleTrace = false;

    for(var i = 0; i < data.length; i++) {
        if(data[i].visible === true) {
            hasOneVisibleTrace = true;
            break;
        }
    }

    if(hasOneVisibleTrace) {
        if(!layout.xaxis) layout.xaxis = {};
        if(!layout.xaxis.rangeslider) layout.xaxis.rangeslider = {};
    }
};
