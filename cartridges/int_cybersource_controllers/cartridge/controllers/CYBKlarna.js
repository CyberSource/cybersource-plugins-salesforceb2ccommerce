/**
* Description of the Controller and the logic it provides
*
* @module  controllers/CYBKlarna
*/

'use strict';

/*
 *Controller that handles the Cybersource Klarna Processing
*/

/* API Includes */

var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
var guard = require(CybersourceConstants.GUARD);
var app = require(CybersourceConstants.APP);

function UpdateSession()
{
    var cart = app.getModel('Cart').get();
    var klarnaAdaptor = require(CybersourceConstants.CS_CORE+'/cartridge/scripts/klarna/adaptor/KlarnaAdaptor');
    let r = require(CybersourceConstants.SG_CONTROLLER+'/cartridge/scripts/util/Response');
    var response = klarnaAdaptor.CreateUpdateSessionServiceRequest(cart.object);
    if(response.submit)
    {
        r.renderJSON(response);
    }
    return;
}

exports.UpdateSession = guard.ensure(['https', 'post'],UpdateSession);
