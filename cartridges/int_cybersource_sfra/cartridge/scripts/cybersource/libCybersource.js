/* eslint-disable */
'use strict';

/**
 * A library file for Cybersource communication.
 * This file is included by several script nodes using:
 *
 *
 * It cannot be used in a script node by itself.
 *
 */
var Site = require('dw/system/Site');

// Helper method to export the helper
function getCybersourceHelper() {
    // eslint-disable-next-line
    return CybersourceHelper;
}

function copyBillTo(billTo) {
    // eslint-disable-next-line
    var requestBillTo = new CybersourceHelper.getcsReference().BillTo();
    var value;
    // eslint-disable-next-line
    if (!empty(billTo)) {
        Object.keys(billTo).forEach(function (name) {
            if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
                value = billTo[name];
                if (value !== '') {
                    requestBillTo[name] = value;
                }
            }
        });
    }
    return requestBillTo;
}

function copyShipTo(shipTo) {
    // eslint-disable-next-line
    var requestShipTo = new CybersourceHelper.getcsReference().ShipTo();
    var value;
    if (!empty(shipTo)) {
        Object.keys(shipTo).forEach(function (name) {
            if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
                value = shipTo[name];
                if (value !== '') {
                    requestShipTo[name] = value;
                }
            }
        });
    }
    return requestShipTo;
}

function copyPurchaseTotals(purchase) {
    // eslint-disable-next-line
    var requestPurchaseTotals = new CybersourceHelper.getcsReference().PurchaseTotals();
    var value;
    if (!empty(purchase)) {
        Object.keys(purchase).forEach(function (name) {
            if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
                value = purchase[name];
                if (value !== '') {
                    requestPurchaseTotals[name] = value;
                }
            }
        });
    }
    return requestPurchaseTotals;
}

function copyCreditCard(card) {
    // eslint-disable-next-line
    var requestCard = new CybersourceHelper.getcsReference().Card();
    var value;
    if (card) {
        Object.keys(card).forEach(function (name) {
            if (name.indexOf('set') === -1 && name.indexOf('get') === -1 && name.indexOf('CardToken') === -1) {
                value = card[name];
                if (value !== '') {
                    requestCard[name] = value;
                }
            }
        });
    }
    return requestCard;
}

function copyItemFrom(item) {
    // eslint-disable-next-line
    var requestItem = new CybersourceHelper.getcsReference().Item();
    var value;
    Object.keys(item).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = item[name];
            if (value !== '') {
                requestItem[name] = value;
            }
        }
    });
    return requestItem;
}

function copyTaxAmounts(taxReply) {
    var taxReplyObj = {};
    var value;
    Object.keys(taxReply).forEach(function (name) {
        if (name.indexOf('Amount') > -1) {
            value = taxReply[name];
            taxReplyObj[name] = value;
        }
    });
    return taxReplyObj;
}

function copyAp(ap) {
    // eslint-disable-next-line
    var requestAp = new CybersourceHelper.getcsReference().apPayer();
    var value;
    Object.keys(ap).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = ap[name];
            if (value !== '') {
                requestAp[name] = value;
            }
        }
    });
    return requestAp;
}

function getPaymentType() {
    return 'vme';
}

function copyPos(pos) {
    // eslint-disable-next-line
    var requestPos = new CybersourceHelper.getcsReference().Pos();
    var value;
    Object.keys(pos).forEach(function (name) {
        if (name.indexOf('set') === -1 && name.indexOf('get') === -1) {
            value = pos[name];
            if (value !== '') {
                requestPos[name] = value;
            }
        }
    });
    return requestPos;
}

function getTransactionMode(deviceType) {
    var transactionMode;
    switch (deviceType) {
        case 'desktop':
            transactionMode = 'S';
            break;
        case 'mobile':
            transactionMode = 'P';
            break;
        case 'tablet':
            transactionMode = 'T';
            break;
        default:
            transactionMode = 'S';
            break;
    }
    return transactionMode;
}

function setClientData(request, refCode, fingerprint) {
    request.merchantReferenceCode = refCode;
    request.partnerSolutionID = getCybersourceHelper().getPartnerSolutionID();
    var developerID = getCybersourceHelper().getDeveloperID();
    var Resource = require('dw/web/Resource');
    if (!empty(developerID)) {
        request.developerID = developerID;
    }
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

    request.clientApplication = CybersourceConstants.APPLICATION_NAME;
    request.clientApplicationVersion = CybersourceConstants.APPLICATION_VERSION;
    request.clientEnvironment = 'Linux';
    request.partnerSDKversion = Resource.msg('global.version.number', 'version', null);
    if (fingerprint) {
        request.deviceFingerprintID = fingerprint;
    }
}

function replaceCharsInSessionID(sessionID) {
    var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
    return sessionID.replace(CybersourceConstants.CHARS_TO_REPLACE_FOR_SESSIONID, CybersourceConstants.SPECIALCHARS);
}

var CybersourceHelper = {

    getcsReference: function() {
        var wsdlName = Site.getCurrent().getCustomPreferenceValue('CsKeystore_Name');
        var webref = webreferences2[wsdlName];
        return webref;
    },

    getMerchantID: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsMerchantId');
    },

    getKeystorePassword: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsKeystore_Password');
    },

    getAliasForSignature: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsAuth_Alias');
    },

    isMLEEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsMLE_Enabled');
    },

    getAliasForMLEinJKSfile: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsJKS_MLEAlias');
    },

    getKeystoreTypeforAuthentication: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsAuth_KeystoreType');
    },

    getklarnaPrivateKeyAlias: function() {
        return Site.getCurrent().getCustomPreferenceValue('klarnaPrivateKeyAlias');
    },

    getEndpoint: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsEndpoint') === null ? '' : Site.getCurrent().getCustomPreferenceValue('CsEndpoint').toString();
    },

    getDefaultShippingMethodTaxCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDefaultShippingMethodTaxCode');
    },

    getPartnerSolutionID: function () {
        return 'FN2YIPRU';
    },

    getDeveloperID: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDeveloperID');
    },

    getDefaultCouponTaxCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDefaultCouponTaxCode');
    },

    getDefaultProductTaxCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDefaultProductTaxCode');
    },

    getAvsIgnoreResult: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsAvsIgnoreResult');
    },

    getAvsDeclineFlags: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsAvsDeclineFlags');
    },

    getDavEnable: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDavEnable');
    },

    getCardDecisionManagerEnable: function () {
        return Site.getCurrent().getCustomPreferenceValue('csCardDecisionManagerEnable');
    },

    getBankTransferDecisionManagerFlag: function () {
        return Site.getCurrent().getCustomPreferenceValue('IsBankTransferDMEnabled');
    },

    getPayPapDMEnableFlag: function () {
        return Site.getCurrent().getCustomPreferenceValue('isDecisionManagerEnable');
    },

    getDavOnAddressVerificationFailure: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDavOnAddressVerificationFailure');
    },

    getShipFromCity: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsShipFromCity');
    },

    getShipFromStateCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsShipFromStateCode');
    },

    getShipFromZipCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsShipFromZipCode');
    },

    getShipFromCountryCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsShipFromCountryCode');
    },

    getPOACity: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPoaCity');
    },

    getPOAStateCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPoaStateCode');
    },

    getPOAZipCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPoaZipCode');
    },

    getPOACountryCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPoaCountryCode');
    },

    getPOOCity: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPooCity');
    },

    getPOOStateCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPooStateCode');
    },

    getPOOZipCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPooZipCode');
    },

    getPOOCountryCode: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPooCountryCode');
    },

    getPAMerchantID: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaMerchantId');
    },
    getPASaveParesStatus: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaSaveParesStatus');
    },
    getPAMerchantName: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaMerchantName');
    },

    getDigitalFingerprintOrgId: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintOrgId');
    },

    getDigitalFingerprintJetmetrixLocation: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintJetmetrixLocation');
    },

    getDigitalFingerprintEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsDeviceFingerprintEnabled');
    },
    getTokenizationEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsTokenizationEnable').value;
    },
    getSubscriptionTokenizationEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsSubscriptionTokenizationEnable').value;
    },
    getProofXMLEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaEnableProofXML');
    },
    getAlipayPaymentType: function () {
        return Site.getCurrent().getCustomPreferenceValue('apPaymentType');
    },
    getTestAlipayReconciliationID: function () {
        return Site.getCurrent().getCustomPreferenceValue('apTestReconciliationID');
    },
    getTestWeChatReconciliationID: function () {
        return Site.getCurrent().getCustomPreferenceValue('apTestWeChatReconciliationID');
    },
    getPaypalSandboxUrl: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalSandboxURL');
    },
    getPaypalLocale: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalLc');
    },
    getPaypalPayFlowColor: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalPayflowcolor');
    },
    IsPaypalConfirmShipping: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalReqconfirmshipping');
    },
    getPaypalHeaderBrdrColor: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalHdrbordercolor');
    },
    getPaypalPageStyle: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalPagestyle');
    },
    getPaypalHeaderBckGroundColor: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalHdrbackcolor');
    },
    IsPaypalAddressOverride: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalAddressOverride');
    },
    IsPaypalNoShipping: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalNoshipping');
    },
    getPaypalLogoImage: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalLogoimg');
    },
    getPaypalHeaderImage: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalHdrimg');
    },
    IsPaypalRequestBillingAddress: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsRequestBillingAddress');
    },
    getPaypalPaymentOption: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsPaypalPaymentOption');
    },
    getCsServiceRequestTimeout: function () {
        return Site.getCurrent().getCustomPreferenceValue('csServiceRequestTimeout');
    },
    getMasterCardAuthIndicator: function () {
        return Site.getCurrent().getCustomPreferenceValue('csMasterCardAuthIndicator');
    },
    getCruiseCredentialsApiKey: function () {
        return Site.getCurrent().getCustomPreferenceValue('CruiseApiKey');
    },
    getCruiseCredentialsApiIdentifier: function () {
        return Site.getCurrent().getCustomPreferenceValue('CruiseApiIdentifier');
    },
    getCruiseCredentialsOrgUnitId: function () {
        return Site.getCurrent().getCustomPreferenceValue('CruiseOrgUnitId');
    },
    getCruiseCredentialsName: function () {
        return Site.getCurrent().getCustomPreferenceValue('CruiseMerchantName');
    },
    getLimitSavedCardRate: function () {
        return Site.getCurrent().getCustomPreferenceValue('LimitSavedCardRate');
    },
    getSavedCardLimitTimeFrame: function () {
        return Site.getCurrent().getCustomPreferenceValue('SavedCardLimitTimeFrame');
    },
    getSavedCardLimitFrame: function () {
        return Site.getCurrent().getCustomPreferenceValue('SavedCardLimitFrame');
    },
    getTransactionTimeOut: function () {
        return Site.getCurrent().getCustomPreferenceValue('WeChatTransactionTimeout');
    },
    getNumofCheckStatusCalls: function () {
        return Site.getCurrent().getCustomPreferenceValue('NumofCheckStatusCalls');
    },
    getServiceCallInterval: function () {
        return Site.getCurrent().getCustomPreferenceValue('CheckStatusServiceInterval');
    },
    getCsTransactionType: function () {
        return Site.getCurrent().getCustomPreferenceValue('CsTransactionType');
    },
    getVisaTransactionType: function () {
        return Site.getCurrent().getCustomPreferenceValue('cybVisaTransactionType');
    },
    getGooglePayTransactionType: function () {
        return Site.getCurrent().getCustomPreferenceValue('googlePayTransactionType');
    },
    getApplePayTransactionType: function () {
        return Site.getCurrent().getCustomPreferenceValue('ApplePayTransactionType');
    },
    /** ***************************************************************************
     * Name: getNexus
     * Description: Returns the Nexus site preference.
     *************************************************************************** */
    getNexus: function () {
        var nexusList = Site.getCurrent().getCustomPreferenceValue('CsNexus');
        var nexus = '';
        var nexusCount = 0;

        for (var i = 0; i < nexusList.length; i += 1) {
            var nexusEntry = nexusList[i];
            if (!empty(nexusEntry)) {
                nexus += nexusCount > 0 ? ', ' : '';
                nexus += nexusEntry;
                nexusCount += 1;
            }
        }
        return nexus;
    },

    /** ***************************************************************************
     * Name: getNoNexus
     * Description: Returns the NoNexus site preference.
     **************************************************************************** */
    getNoNexus: function () {
        var noNexusList = Site.getCurrent().getCustomPreferenceValue('CsNoNexus');
        var noNexus = '';
        var noNexusCount = 0;

        for (var i = 0; i < noNexusList.length; i += 1) {
            var noNexusEntry = noNexusList[i];
            if (!empty(noNexusEntry)) {
                noNexus += noNexusCount > 0 ? ', ' : '';
                noNexus += noNexusEntry;
                noNexusCount += 1;
            }
        }

        return noNexus;
    },

    setEndpoint: function (service) {
        var endpoint = CybersourceHelper.getEndpoint();
        var Logger = dw.system.Logger.getLogger('Cybersource');
        Logger.debug('Connection to system "{0}"', endpoint);
        var Port = require('dw/ws/Port');
        var WSUtil = require('dw/ws/WSUtil');
        switch (endpoint) {
            case 'Production':
                WSUtil.setProperty(Port.ENDPOINT_ADDRESS_PROPERTY, 'https://ics2wsa.ic3.com/commerce/1.x/transactionProcessor', service);
                break;
            case 'Test':
                WSUtil.setProperty(Port.ENDPOINT_ADDRESS_PROPERTY, 'https://ics2wstesta.ic3.com/commerce/1.x/transactionProcessor', service);
                break;
            default:
                // eslint-disable-next-line
                throw 'Undefined Cybersource Endpoint "' + endpoint + '"';
        }
    },


    /** ***************************************************************************
     * request  ,
     * vc_orderID     - visa checkout  callID
     **************************************************************************** */
    addVCOrderID: function (request, vcOrderID) {
        var requestVc = new CybersourceHelper.getcsReference().VC();
        requestVc.orderID = vcOrderID;
        request.vc = requestVc;
    },
    /** ***************************************************************************
     * request  ,
     * refCode     - Basket.UUID
     * wrappedKey     - wrappedKey
     * refCode  : Blob   - large blob object
     **************************************************************************** */
    addVCDecryptRequestInfo: function (request, refCode, wrappedKey, data) {
        request.merchantID = CybersourceHelper.getMerchantID();
        request.paymentSolution = 'visacheckout';
        setClientData(request, refCode, null);
        var requestEncryptedPayment = new CybersourceHelper.getcsReference().EncryptedPayment();
        requestEncryptedPayment.wrappedKey = wrappedKey;
        requestEncryptedPayment.data = data;
        request.encryptedPayment = requestEncryptedPayment;
        request.decryptVisaCheckoutDataService = new CybersourceHelper.getcsReference().DecryptVisaCheckoutDataService();
        request.decryptVisaCheckoutDataService.run = true;
    },
    /** ***************************************************************************
     * request  ,
     * refCode     - Basket.UUID or orderNo
     * wrappedKey     - wrappedKey
     * refCode  : Blob   - large blob object
     **************************************************************************** */
    addVCAuthRequestInfo: function (request, refCode, wrappedKey, data) {
        request.merchantID = CybersourceHelper.getMerchantID();
        request.paymentSolution = 'visacheckout';
        setClientData(request, refCode, null);
        var requestEncryptedPayment = new CybersourceHelper.getcsReference().EncryptedPayment();
        requestEncryptedPayment.wrappedKey = wrappedKey;
        requestEncryptedPayment.data = data;
        request.encryptedPayment = requestEncryptedPayment;
    },
    /** ***************************************************************************
     * request  ,
     * refCode     - Basket.UUID or orderNo
     * refCode  : Blob   - large blob object
     **************************************************************************** */
    addMobilePaymentAPIAuthRequestInfo: function (request, refCode, data) {
        request.merchantID = CybersourceHelper.getMerchantID();
        request.paymentSolution = '001';
        setClientData(request, refCode, null);
        var requestEncryptedPayment = new CybersourceHelper.getcsReference().EncryptedPayment();
        requestEncryptedPayment.descriptor = 'RklEPUNPTU1PTi5BUFBMRS5JTkFQUC5QQVlNRU5U';
        requestEncryptedPayment.data = data;
        request.encryptedPayment = requestEncryptedPayment;
    },
    /** ***************************************************************************
     * request  ,
     * refCode     - Basket.UUID or orderNo
     * refCode  : Blob   - large blob object
     **************************************************************************** */
    addMobilePaymentInAppAuthRequestInfo: function (request, authRequestParams) {
        request.merchantID = CybersourceHelper.getMerchantID();
        var CybersourceConstants = require('../utils/CybersourceConstants');
        request.paymentSolution = (authRequestParams.MobilePaymentType === CybersourceConstants.METHOD_ApplePay ? '001' : '006');
        setClientData(request, authRequestParams.orderNo, null);
        var requestPaymentNetworkToken = new CybersourceHelper.getcsReference().PaymentNetworkToken();
        requestPaymentNetworkToken.transactionType = '1';
        request.paymentNetworkToken = requestPaymentNetworkToken;
    },
    /** ***************************************************************************
     * request  ,
     * billTo   : BillTo_Object,
     * shipTo   : ShipTo_Object,
     * purchase : PurchaseTotals_Object,
     * card     : Card_Object,
     * refCode     - Basket.UUID
     **************************************************************************** */
    addCCAuthRequestInfo: function (request, billTo, shipTo, purchase, card, refCode, enableDeviceFingerprint, itemsCybersource) {
        request.merchantID = CybersourceHelper.getMerchantID();
        var fingerprint = null;
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(refCode);
        var paymentMethod = order.paymentInstruments[0].paymentMethod;
        var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');

        
        if (enableDeviceFingerprint && CybersourceHelper.getCardDecisionManagerEnable()) {
            fingerprint = replaceCharsInSessionID(session.sessionID);
        }

        setClientData(request, refCode, fingerprint);
        if (billTo !== null) {
            request.billTo = copyBillTo(billTo);
        }
        request.shipTo = copyShipTo(shipTo);
        request.purchaseTotals = copyPurchaseTotals(purchase);

        var server = require('server');
        var form = server.forms.getForm('billing');
        var transientToken = form.creditCardFields.flexresponse.value;
        // check here for transient token and assign
        if (transientToken) {
                request.tokenSource = new CybersourceHelper.getcsReference().TokenSource();
                request.tokenSource.transientToken = transientToken;
        } else if (!empty(card)) {
            if (empty(card.getCreditCardToken())) {
                request.card = copyCreditCard(card);
            } else {
                var requestCard = new CybersourceHelper.getcsReference().Card();
                var value;
                Object.keys(card).forEach(function (name) {
                    if (name.indexOf('set') === -1 && name.indexOf('get') === -1 && name.indexOf('CardToken') === -1 && name.indexOf('accountNumber') === -1) {
                        value = card[name];
                        if (value !== '') {
                            requestCard[name] = value;
                        }
                    }
                });
                request.card = requestCard;
            }

            var cardType = request.card.getCardType();
            if (cardType === '002') {
                var mastercardAuthIndicator = CybersourceHelper.getMasterCardAuthIndicator();
                if (!empty(mastercardAuthIndicator) && mastercardAuthIndicator === '0') {
                    request.authIndicator = 0;
                } else if (!empty(mastercardAuthIndicator) && mastercardAuthIndicator === '1') {
                    request.authIndicator = 1;
                }
            }
        }

        var items = [];
        if (itemsCybersource !== null) {
            var iter = itemsCybersource.iterator();
            while (iter.hasNext()) {
                items.push(copyItemFrom(iter.next()));
            }
        }

        request.item = items;

        request.decisionManager = new CybersourceHelper.getcsReference().DecisionManager();
        if (CybersourceHelper.getCardDecisionManagerEnable()) {
            request.decisionManager.enabled = true;
        } else {
            request.decisionManager.enabled = false;
        }
        // CMCIC
        request.cardTypeSelectionIndicator = '1';
        request.ccAuthService = new CybersourceHelper.getcsReference().CCAuthService();
        request.ccAuthService.run = true;    
        //Sale Transaction
        if (paymentMethod === 'CREDIT_CARD' && CybersourceHelper.getCsTransactionType().value === 'sale') {
            request.ccCaptureService = new CybersourceHelper.getcsReference().CCCaptureService();
            request.ccCaptureService.run = true;
        }else if (paymentMethod === 'VISA_CHECKOUT' && CybersourceHelper.getVisaTransactionType().value === 'sale') {
            request.ccCaptureService = new CybersourceHelper.getcsReference().CCCaptureService();
            request.ccCaptureService.run = true;
        }else if (paymentMethod === 'DW_GOOGLE_PAY' && CybersourceHelper.getGooglePayTransactionType().value === 'sale') {
            request.ccCaptureService = new CybersourceHelper.getcsReference().CCCaptureService();
            request.ccCaptureService.run = true;
        }else if (paymentMethod === 'DW_APPLE_PAY' && CybersourceHelper.getApplePayTransactionType().value === 'sale') {
            request.ccCaptureService = new CybersourceHelper.getcsReference().CCCaptureService();
            request.ccCaptureService.run = true;
        }
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * card     : Card_Object,
     * pos        : Pos_Object
     * refCode
     **************************************************************************** */
    addPOSAuthRequestInfo: function (request, location, purchase, card, refCode, enableDeviceFingerprint, pos) {
        request.merchantID = CybersourceHelper.getPosMerchantID(location);
        var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
        var fingerprint = null;
        if (enableDeviceFingerprint) {
            fingerprint = replaceCharsInSessionID(session.sessionID);
        }

        setClientData(request, refCode, fingerprint);

        if (!empty(pos) && !empty(pos.getEntryMode()) && pos.getEntryMode().equals('keyed')) {
            request.card = copyCreditCard(card);
        }

        request.purchaseTotals = copyPurchaseTotals(purchase);

        request.ccAuthService = new CybersourceHelper.getcsReference().CCAuthService();

        if (!empty(pos) && !empty(pos.getEntryMode()) && !empty(pos.getCardPresent()) && !empty(pos.getTerminalCapability())) {
            request.pos = copyPos(pos);
            request.ccAuthService.commerceIndicator = 'retail';
        }
        request.decisionManager = new CybersourceHelper.getcsReference().DecisionManager();
        request.decisionManager.enabled = false;
        request.ccAuthService.run = true;
    },

    /** ***************************************************************************
     * Name: addPaySubscriptionCreateService
     * Description: Add Subscription Creation service to request.
     *************************************************************************** */
    addPaySubscriptionCreateService: function (
        request,
        billTo,
        purchase,
        card,
        refCode
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        if (billTo !== null) {
            request.billTo = copyBillTo(billTo);
        }
        request.purchaseTotals = copyPurchaseTotals(purchase);
        var server = require('server');
        var form = server.forms.getForm('billing');
        var transientToken = form.creditCardFields.flexresponse.value;
        // check here for transient token and assign
        if (transientToken) {
            request.tokenSource = new CybersourceHelper.getcsReference().TokenSource();
            request.tokenSource.transientToken = transientToken;
        } else if (card !== null) {
            request.card = copyCreditCard( card );
        }
        session.custom.isScaEnabled = dw.system.Site.getCurrent().getCustomPreferenceValue('IsSCAEnabled');
        request.cardTypeSelectionIndicator = '1';
        request.recurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
        request.recurringSubscriptionInfo.frequency = 'on-demand';
        request.paySubscriptionCreateService = new CybersourceHelper.getcsReference().PaySubscriptionCreateService();
        request.paySubscriptionCreateService.disableAutoAuth = 'false';
        request.paySubscriptionCreateService.run = true;
        request.decisionManager = new CybersourceHelper.getcsReference().DecisionManager();
        request.decisionManager.enabled = true;
    },

    /** ***************************************************************************
     * Name: addPaySubscriptionRetrieveService
     * Description: Add Subscription Retreival service to request.
     *************************************************************************** */
    addPaySubscriptionRetrieveService: function (
        request,
        refCode,
        subscriptionID
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.recurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
        request.recurringSubscriptionInfo.subscriptionID = subscriptionID;
        request.paySubscriptionRetrieveService = new CybersourceHelper.getcsReference().PaySubscriptionRetrieveService();
        request.paySubscriptionRetrieveService.run = true;
    },

    /** ***************************************************************************
     * Name: addPaySubscriptionDeleteService
     * Description: Add Subscription Deletion service to request.
     *************************************************************************** */
    addPaySubscriptionDeleteService: function (
        request,
        refCode,
        subscriptionID
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.recurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
        request.recurringSubscriptionInfo.subscriptionID = subscriptionID;
        request.paySubscriptionDeleteService = new CybersourceHelper.getcsReference().PaySubscriptionDeleteService();
        request.paySubscriptionDeleteService.run = true;
    },

    /** ***************************************************************************
     * Name: addSubscriptionUpdateInfo
     * Description: Add Subscription Updation service to request.
     *************************************************************************** */
    addSubscriptionUpdateInfo: function (
        request,
        billTo,
        purchase,
        card,
        subscriptionID
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        var merchantRefCode = '0000000'; // dummy value as it is not required for this call
        setClientData(request, merchantRefCode);
        request.billTo = copyBillTo(billTo);

        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.card = copyCreditCard(card);

        var requestRecurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
        requestRecurringSubscriptionInfo.subscriptionID = subscriptionID;
        request.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;

        request.paySubscriptionUpdateService = new CybersourceHelper.getcsReference().PaySubscriptionUpdateService();
        request.paySubscriptionUpdateService.run = true;
    },

    /** ***************************************************************************
     * Name: addOnDemandSubscriptionInfo
     * Description: Add On Demand payment service to request.
     *************************************************************************** */
    addOnDemandSubscriptionInfo: function (
        subscriptionID,
        request,
        purchase,
        refCode
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        var fingerprint = null;
        var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
        if (CybersourceHelper.getDigitalFingerprintEnabled()) {
            fingerprint = replaceCharsInSessionID(session.sessionID);
        }

        setClientData(request, refCode, fingerprint);
        request.purchaseTotals = copyPurchaseTotals(purchase);

        var requestRecurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
        requestRecurringSubscriptionInfo.subscriptionID = subscriptionID;
        request.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;
    },

    addDAVRequestInfo: function (request, billTo, shipTo, ignoreDAVResult, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        if (!empty(refCode)) {
            setClientData(request, refCode);
        }
        if (billTo !== null) {
            request.billTo = copyBillTo(billTo);
        }
        request.shipTo = copyShipTo(shipTo);

        request.davService = new CybersourceHelper.getcsReference().DAVService();
        request.davService.run = true;

        if (!('businessRules' in request && !empty(request.businessRules))) {
            request.businessRules = new CybersourceHelper.getcsReference().BusinessRules();
        }

        if (ignoreDAVResult) {
            request.businessRules.ignoreDAVResult = true;
        } else {
            request.businessRules.ignoreDAVResult = false;
        }
    },

    addAVSRequestInfo: function (request, ignoreAVSResult, declineAVSFlags) {
        if (!('businessRules' in request && !empty(request.businessRules))) {
            request.businessRules = new CybersourceHelper.getcsReference().BusinessRules();
        }

        if (!empty(ignoreAVSResult) && ignoreAVSResult.valueOf()) {
            request.businessRules.ignoreAVSResult = true;
        } else {
            request.businessRules.ignoreAVSResult = false;
        }

        if (!empty(declineAVSFlags)) {
            request.businessRules.declineAVSFlags = declineAVSFlags;
        }
    },

    addPayerAuthSetupInfo: function (serviceRequestObj, creditCardForm, orderNo, subscriptionToken){
        var serviceRequest = serviceRequestObj;
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();

        setClientData(serviceRequest, orderNo);

        if (subscriptionToken !== 'undefined' && !empty(subscriptionToken)) {
            var requestRecurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
            requestRecurringSubscriptionInfo.subscriptionID = subscriptionToken;
            serviceRequest.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;
        } else if (null !== creditCardForm && empty(creditCardForm.flexresponse.value)) {
			CybersourceHelper.addCardInfo(serviceRequest, creditCardForm);
		} else if (null !== creditCardForm && !empty(creditCardForm.flexresponse.value)) {
			serviceRequest.tokenSource = new CybersourceHelper.getcsReference().TokenSource();
			serviceRequest.tokenSource.transientToken = creditCardForm.flexresponse.value;
		}
        serviceRequest.payerAuthSetupService = new CybersourceHelper.getcsReference().PayerAuthSetupService();
        serviceRequest.payerAuthSetupService.run = true;
    },

    addPayerAuthEnrollInfo: function (serviceRequestObj, orderNo, creditCardForm, countryCode, amount, subscriptionToken, phoneNumber, deviceType, billTo, paymentMethodID) {
        var serviceRequest = serviceRequestObj;
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();

        setClientData(serviceRequest, orderNo);

        if (billTo !== null) {
            if(session.privacy.screenHeight && session.privacy.screenWidth){
                billTo.setHttpBrowserScreenHeight(session.privacy.screenHeight);
                billTo.setHttpBrowserScreenWidth(session.privacy.screenWidth);
            }
            serviceRequest.billTo = copyBillTo(billTo);
        }

        if (subscriptionToken !== 'undefined' && !empty(subscriptionToken)) {
            var requestRecurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
            requestRecurringSubscriptionInfo.subscriptionID = subscriptionToken;
            serviceRequest.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;
        } else if (null !== creditCardForm && empty(creditCardForm.flexresponse.value)) {
			CybersourceHelper.addCardInfo(serviceRequest, creditCardForm);
		} else if (null !== creditCardForm && !empty(creditCardForm.flexresponse.value)) {
			serviceRequest.tokenSource = new CybersourceHelper.getcsReference().TokenSource();
			serviceRequest.tokenSource.transientToken = creditCardForm.flexresponse.value;
		}
        serviceRequest.payerAuthEnrollService = new CybersourceHelper.getcsReference().PayerAuthEnrollService();
        serviceRequest.purchaseTotals = new CybersourceHelper.getcsReference().PurchaseTotals();
        serviceRequest.purchaseTotals.currency = amount.currencyCode;
        var items = [];
        var item = new CybersourceHelper.getcsReference().Item();
        var StringUtils = require('dw/util/StringUtils');
        item.id = 0;
        item.unitPrice = StringUtils.formatNumber(amount.value, '000000.00');
        items.push(item);
        serviceRequest.item = items;
        serviceRequest.payerAuthEnrollService.run = true;
        serviceRequest.payerAuthEnrollService.referenceID = session.privacy.DFReferenceId;
        if(session.custom.enroll == false || session.custom.SCA == false || session.custom.isScaEnabled == true){
        serviceRequest.payerAuthEnrollService.challengeCode = '04';
        }
        var URLUtils = require('dw/web/URLUtils');
        serviceRequest.payerAuthEnrollService.returnURL =URLUtils.https('COPlaceOrder-Submit','provider','card').toString();
        serviceRequest.payerAuthEnrollService.mobilePhone = phoneNumber;
        // var currentDevice = session.privacy.device;
        serviceRequest.payerAuthEnrollService.transactionMode = getTransactionMode(deviceType);
        if (!empty(paymentMethodID)) {
            CybersourceHelper.apDecisionManagerService(paymentMethodID, serviceRequest);
        }
        // serviceRequest.payerAuthEnrollService.transactionMode= 'S';
    },

    addTestPayerAuthEnrollInfo: function (request, card) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, 'TestOrder');
        request.card = copyCreditCard(card);
        request.payerAuthEnrollService = new CybersourceHelper.getcsReference().PayerAuthEnrollService();
        request.purchaseTotals = new CybersourceHelper.getcsReference().PurchaseTotals();
        request.purchaseTotals.currency = 'USD';
        var items = [];
        var item = new CybersourceHelper.getcsReference().Item();
        var StringUtils = require('dw/util/StringUtils');
        item.id = 0;
        item.unitPrice = StringUtils.formatNumber('100', '000000.00');
        items.push(item);
        request.item = items;
        request.payerAuthEnrollService.run = true;
    },

    addTestPayerAuthValidateInfo: function (request, signedPARes, card) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, 'TestOrder');
        request.card = copyCreditCard(card);
        request.payerAuthValidateService = new CybersourceHelper.getcsReference().PayerAuthValidateService();
        request.payerAuthValidateService.signedPARes = signedPARes;
        request.purchaseTotals = new CybersourceHelper.getcsReference().PurchaseTotals();
        request.purchaseTotals.currency = 'USD';
        var items = [];
        var item = new CybersourceHelper.getcsReference().Item();
        var StringUtils = require('dw/util/StringUtils');
        item.id = 0;
        item.unitPrice = StringUtils.formatNumber('100', '000000.00');
        items.push(item);
        request.item = items;
        request.payerAuthValidateService.run = true;
    },

    addCardInfo: function (request, creditCardForm) {
        var StringUtils = require('dw/util/StringUtils');
        request.card = new CybersourceHelper.getcsReference().Card();
        request.card.expirationMonth = StringUtils.formatNumber(creditCardForm.expirationMonth.value, '00');
        request.card.expirationYear = creditCardForm.expirationYear.value;
        request.card.accountNumber = creditCardForm.cardNumber.value;

        switch (creditCardForm.cardType.value) {
            case 'Visa':
                request.card.cardType = '001';
                break;
            case 'MasterCard':
                request.card.cardType = '002';
                break;
            case 'Master Card':
                request.card.cardType = '002';
                break;
            case 'Amex':
                request.card.cardType = '003';
                break;
            case 'Discover':
                request.card.cardType = '004';
                break;
            case 'Maestro':
                request.card.cardType = '042';
                break;
            case 'JCB':
                request.card.cardType = '007';
                break;
            case 'DinersClub':
                request.card.cardType = '005';
                break;
            default:
                request.card.cardType = '001';
                break;
        }
        return request;
    },

    addPayerAuthValidateInfo: function (request, orderNo, signedPARes, creditCardForm, amount, subscriptionToken, processorTransactionId, billTo) {
        request.merchantID = CybersourceHelper.getMerchantID();

        setClientData(request, orderNo);

        if (subscriptionToken !== 'undefined' && !empty(subscriptionToken)) {
            var requestRecurringSubscriptionInfo = new CybersourceHelper.getcsReference().RecurringSubscriptionInfo();
            requestRecurringSubscriptionInfo.subscriptionID = subscriptionToken;
            request.recurringSubscriptionInfo = requestRecurringSubscriptionInfo;
        } else if (null !== creditCardForm && empty(creditCardForm.flexresponse.value)) {
			CybersourceHelper.addCardInfo(request, creditCardForm);
		} else if (null !== creditCardForm && !empty(creditCardForm.flexresponse.value)) {
			request.tokenSource = new CybersourceHelper.getcsReference().TokenSource();
			request.tokenSource.transientToken = creditCardForm.flexresponse.value;
		}

        if (billTo !== null) {
            request.billTo = copyBillTo(billTo);
        }

        // validate specific stuff
        request.payerAuthValidateService = new CybersourceHelper.getcsReference().PayerAuthValidateService();
        request.payerAuthValidateService.signedPARes = signedPARes;
        request.payerAuthValidateService.authenticationTransactionID = processorTransactionId;

        request.purchaseTotals = new CybersourceHelper.getcsReference().PurchaseTotals();
        request.purchaseTotals.currency = amount.currencyCode;
        var items = [];
        var item = new CybersourceHelper.getcsReference().Item();
        var StringUtils = require('dw/util/StringUtils');
        item.id = 0;
        item.unitPrice = StringUtils.formatNumber(amount.value, '000000.00');
        items.push(item);
        request.item = items;

        request.payerAuthValidateService.run = true;
        if (CybersourceHelper.getCardDecisionManagerEnable()){
            request.afsService = new CybersourceHelper.getcsReference().AFSService();
            request.afsService.run = true;
        }
    },

    // eslint-disable-next-line
    addPayerAuthReplyInfo: function (request, cavv, ucafAuthenticationData, ucafCollectionIndicator, eciRaw, commerceIndicator, xid, paresStatus, specificationVersion, directoryTrnsctnId, cavvAlgorithm, effectiveAuthenticationType, challengeCancelCode, authenticationStatusReason, acsTransactionID, authorizationPayload) {
        if (request.ccAuthService === null) {
            request.ccAuthService = new CybersourceHelper.getcsReference().CCAuthService();
        }
        if (commerceIndicator !== null) {
            request.ccAuthService.commerceIndicator = commerceIndicator;
        }
        if (xid !== null) {
            request.ccAuthService.xid = xid;
        }
        if (cavv !== null) {
            request.ccAuthService.cavv = cavv;
        }
        if (eciRaw !== null) {
            request.ccAuthService.eciRaw = eciRaw;
        }
        if (specificationVersion !== null) {
            request.ccAuthService.paSpecificationVersion = specificationVersion;
        }
        if (directoryTrnsctnId !== null) {
            request.ccAuthService.directoryServerTransactionID = directoryTrnsctnId;
        }
        if (!empty(session.privacy.veresEnrolled)) {
            request.ccAuthService.veresEnrolled = session.privacy.veresEnrolled;
            session.privacy.veresEnrolled = ' ';
        }
        if (!empty(session.privacy.networkScore)) {
            request.ccAuthService.paNetworkScore = session.privacy.networkScore;
            session.privacy.networkScore = ' ';
        }
        if (!empty(cavvAlgorithm)) {
            request.ccAuthService.cavvAlgorithm = cavvAlgorithm;
        }
        if (!empty(effectiveAuthenticationType)) {
            request.ccAuthService.effectiveAuthenticationType = effectiveAuthenticationType;
        }
        if (!empty(challengeCancelCode)) {
            request.ccAuthService.challengeCancelCode = challengeCancelCode;
        }

        if (authenticationStatusReason !== null && !empty(authenticationStatusReason)) {
            request.ccAuthService.paresStatusReason = authenticationStatusReason;
        }
        /* if (!empty(acsTransactionID)) {
            request.ccAuthService.acsTransactionID = acsTransactionID;
        } */
        /* if (!empty(authorizationPayload)) {
            request.ccAuthService.authorizationPayload = authorizationPayload;
        } */

        request.ccAuthService.paAuthenticationDate = dw.util.StringUtils.formatCalendar(new dw.util.Calendar(), 'yyyyMMddHHmmss');

        if (!empty(ucafAuthenticationData)) {
            request.ucaf = new CybersourceHelper.getcsReference().UCAF();
            request.ucaf.authenticationData = ucafAuthenticationData;
            request.ucaf.collectionIndicator = ucafCollectionIndicator;
        } else if (!empty(ucafCollectionIndicator)) {
            request.ucaf = new CybersourceHelper.getcsReference().UCAF();
            request.ucaf.collectionIndicator = ucafCollectionIndicator;
        }
        if (CybersourceHelper.getPASaveParesStatus() && paresStatus !== null) {
            request.ccAuthService.paresStatus = paresStatus;
        }
    },

    /** ***************************************************************************
     * AP Services Starts here
     * request  ,
     * purchase : PurchaseTotals_Object,
     * ap   : AP_Object,
     * refCode     - Basket.UUID
     **************************************************************************** */
    addAPAuthRequestInfo: function (request, purchase, ap, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.apPaymentType = getPaymentType();
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.ap = copyAp(ap);
        request.apAuthService = new CybersourceHelper.getcsReference().APAuthService();
        request.apAuthService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * ap   : AP_Object,
     * refCode     - Basket.UUID
     **************************************************************************** */
    addAPCheckoutDetailsRequestInfo: function (request, purchase, ap, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.apPaymentType = getPaymentType();
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.ap = copyAp(ap);
        request.apCheckoutDetailsService = new CybersourceHelper.getcsReference().APCheckOutDetailsService();
        request.apCheckoutDetailsService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * ap     : AP_Object,
     * refCode     - Basket.UUID
     * Name : addAPConfirmPurchaseRequestInfo
     **************************************************************************** */
    addAPConfirmPurchaseRequestInfo: function (request, purchase, ap, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.ap = copyAp(ap);
        request.apPaymentType = getPaymentType();
        request.apConfirmPurchaseService = new CybersourceHelper.getcsReference().APConfirmPurchaseService();
        request.apConfirmPurchaseService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * refCode     - Basket.UUID
     * Name: addAPAuthReversalServiceInfo
     **************************************************************************** */

    addAPAuthReversalServiceInfo: function (
        request,
        purchase,
        refCode,
        authRequestID
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.apPaymentType = getPaymentType();
        request.apAuthReversalService = new CybersourceHelper.getcsReference().APAuthReversalService();
        request.apAuthReversalService.authRequestID = authRequestID;
        request.apAuthReversalService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * refCode     - Basket.UUID
     * Name: addAPCaptureServiceInfo
     *************************************************************************** */
    addAPCaptureServiceInfo: function (
        request,
        purchase,
        refCode,
        authRequestID
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.apPaymentType = getPaymentType();
        request.apCaptureService = new CybersourceHelper.getcsReference().APCaptureService();
        request.apCaptureService.authRequestID = authRequestID;
        request.apCaptureService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * refCode     - Basket.UUID
     * reason
     * note
     * Name: addAPRefundServiceInfo
     *************************************************************************** */
    addAPRefundServiceInfo: function (
        request,
        purchase,
        refCode,
        authCaptureID,
        reason,
        note
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.apPaymentType = getPaymentType();
        request.apRefundService = new CybersourceHelper.getcsReference().APRefundService();
        request.apRefundService.captureRequestID = authCaptureID;
        request.apRefundService.reason = reason;
        request.apRefundService.note = note;
        request.apRefundService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * ap : AP_Object,
     * refCode     - Basket.UUID
     * Name: addAPInitiateServiceInfo
     *************************************************************************** */
    addAPInitiateServiceInfo: function (
        request,
        purchase,
        ap,
        refCode
    ) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.ap = copyAp(ap);
        request.apPaymentType = getPaymentType();
        request.apInitiateService = new CybersourceHelper.getcsReference().APInitiateService();
        request.apInitiateService.run = true;
    },

    /** ***************************************************************************
     * Name: getPosMerchantID
     * Description: Returns Merchant ID.
     *************************************************************************** */
    getPosMerchantID: function (location) {
        var customObject = null;
        var merchantID = null;

        var CustomObjectMgr = require('dw/object/CustomObjectMgr');
        customObject = CustomObjectMgr.getCustomObject('POS_MerchantIDs', location);
        if (customObject !== null) { merchantID = customObject.custom.MerchantID; }

        return merchantID;
    },

    /** ***************************************************************************
     * Name: apInitiateService
     * Description: Returns Alipay token, Set Request id and Request Token.
     * param : request, returnUrl , PurchaseTotals_Object, productName, productDescription, orderNo, alipayPaymentType
     *************************************************************************** */
    apInitiateService: function (request, returnUrl, purchase, productName, productDescription, orderNo, alipayPaymentType) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, orderNo);
        request.purchaseTotals = copyPurchaseTotals(purchase);
        request.apPaymentType = alipayPaymentType;
        var endpoint = CybersourceHelper.getEndpoint();
        var testReconciliationID = CybersourceHelper.getTestAlipayReconciliationID();
        var apInitiateService = new CybersourceHelper.getcsReference().APInitiateService();

        apInitiateService.returnURL = returnUrl;
        apInitiateService.productName = productName;
        apInitiateService.productDescription = productDescription;
        if (endpoint.equals('Test')) {
            apInitiateService.reconciliationID = testReconciliationID;
        }
        request.apInitiateService = apInitiateService;
        request.apInitiateService.run = true;
    },

    /** ***************************************************************************
     * Name: apBillingAgreementService
     * Description: Returns request ID, billing agreement ID
     * param : request, orderNo , requestID, paymentType
     *************************************************************************** */
    apBillingAgreementService: function (request, orderNo, requestID) {
        // var Logger = require('dw/system/Logger').getLogger('Cybersource');
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, orderNo);
        request.apPaymentType = 'PPL';

        var apBillingAgreementService = new CybersourceHelper.getcsReference().APBillingAgreementService();

        apBillingAgreementService.sessionsRequestID = requestID;
        request.apBillingAgreementService = apBillingAgreementService;
        request.apBillingAgreementService.run = true;
    },

    /** ***************************************************************************
     * Name: apCheckStatusService
     * Description: Returns Alipay token, Payment Status, Set Request id and Request Token.
     * param : request, orderNo , requestID, alipayPaymentType
     *************************************************************************** */
    /** ***************************************************************************
     * Name: apCheckStatusService
     * Description: Returns Alipay token, Payment Status, Set Request id and Request Token.
     * param : request, orderNo , requestID, alipayPaymentType
     *************************************************************************** */
    apCheckStatusService: function (request, orderNo, requestID, paymentType, reconciliationID) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, orderNo);
        request.apPaymentType = paymentType;
        var endpoint = CybersourceHelper.getEndpoint();
        var apCheckStatusService = new CybersourceHelper.getcsReference().APCheckStatusService();

        switch (paymentType) {
            case 'APY':
            case 'APD':
                apCheckStatusService.apInitiateRequestID = requestID;
                break;
            case 'PPL':
                apCheckStatusService.sessionsRequestID = requestID;
                break;
            case 'WQR':
                apCheckStatusService.apInitiateRequestID = requestID;
                if (endpoint.equals('Test') && reconciliationID !== 'SETTLED') {
                    apCheckStatusService.reconciliationID = reconciliationID;
                }
                break;
            default:
                apCheckStatusService.checkStatusRequestID = requestID;
        }
        request.apCheckStatusService = apCheckStatusService;
        request.apCheckStatusService.run = true;
    },

    /** ***************************************************************************
     * Name: payPalCaptureService
     * Description: Initiate the Capture for transactionId .
     *
     *************************************************************************** */
    /* payPalCaptureService: function (request, paypalAuthorizationRequestToken, paypalAuthorizationRequestId, transactionType, transactionId, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);

        var paypalCaptureService = new CybersourceHelper.getcsReference().PayPalDoCaptureService();
        paypalCaptureService.paypalAuthorizationId = transactionId;
        paypalCaptureService.completeType = transactionType;
        paypalCaptureService.paypalAuthorizationRequestID = paypalAuthorizationRequestId;
        paypalCaptureService.paypalAuthorizationRequestToken = paypalAuthorizationRequestToken;
        request.payPalDoCaptureService = paypalCaptureService;
        request.payPalDoCaptureService.run = true;
    }, */
    /** ***************************************************************************
     * Name: payPalReversalService
     * Description: Initiate the Reversal for transactionId .
     *
     *************************************************************************** */
    payPalReversalService: function (request, transactionId, requestId, requestToken, refCode) {
        request.merchantID = CybersourceHelper.getMerchantID();
        setClientData(request, refCode);
        var payPalAuthReversalService = new CybersourceHelper.getcsReference().PayPalAuthReversalService();
        payPalAuthReversalService.paypalAuthorizationId = transactionId;
        payPalAuthReversalService.paypalAuthorizationRequestID = requestId;
        payPalAuthReversalService.paypalAuthorizationRequestToken = requestToken;
        request.payPalAuthReversalService = payPalAuthReversalService;
        request.payPalAuthReversalService.run = true;
    },

    /** ***************************************************************************
     * Name: payPalRefund/CreditService
     * Description: Initiate the Refund/Credit for transactionId .
     *
     *************************************************************************** */
    payPalRefundService: function (request, merchantRefCode, requestId, paymentType) {
        var payPalRefundService = new CybersourceHelper.getcsReference().APRefundService();
        payPalRefundService.refundRequestID = requestId;
        request.apRefundService = payPalRefundService;
        request.apPaymentType = paymentType;
        request.apRefundService.run = true;
    },

    /** ***************************************************************************
     * Name: payPalReversalService
     * Description: Initiate the Reversal for transactionId .
     *
     *************************************************************************** */
    payPalAuthReversalService: function (request, merchantRefCode, requestId, paymentType) {
        var apAuthReversalService = new CybersourceHelper.getcsReference().APAuthReversalService();
        apAuthReversalService.authRequestID = requestId;
        request.apAuthReversalService = apAuthReversalService;
        request.apPaymentType = paymentType;
        request.apAuthReversalService.run = true;
    },

    /** ***************************************************************************
     * Name: payPalCaptureService
     * Description: Initiate the Capture for transactionId .
     *
     *************************************************************************** */
    payPalCaptureService: function (request, merchantRefCode, requestId, paymentType) {
        var apCaptureService = new CybersourceHelper.getcsReference().APCaptureService();
        apCaptureService.authRequestID = requestId;
        request.apCaptureService = apCaptureService;
        request.apPaymentType = paymentType;
        request.apCaptureService.run = true;
    },

    /** ***************************************************************************
     * request  ,
     * purchase : PurchaseTotals_Object,
     * refCode     - Basket.UUID
     * Name: addCCAuthReversalServiceInfo
     **************************************************************************** */
    addCCAuthReversalServiceInfo: function (serviceRequestObj, refCode, requestID) {
        var serviceRequest = serviceRequestObj;
        serviceRequest.merchantID = CybersourceHelper.getMerchantID();
        setClientData(serviceRequest, refCode);
        var ccAuthReversalService = new CybersourceHelper.getcsReference().CCAuthReversalService();
        ccAuthReversalService.authRequestID = requestID;
        serviceRequest.ccAuthReversalService = ccAuthReversalService;
        serviceRequest.ccAuthReversalService.run = true;
    },

    /** ***************************************************************************
     * Name: ccCaptureService
     * Description: Initiate the Capture for Credit Cards.
     *
     *************************************************************************** */
    ccCaptureService: function (request, merchantRefCode, requestId, paymentType) {
        var ccCaptureService = new CybersourceHelper.getcsReference().CCCaptureService();
        ccCaptureService.authRequestID = requestId;
        request.ccCaptureService = ccCaptureService;
        request.paymentSolution = paymentType;
        request.ccCaptureService.run = true;
    },

    ccCreditService: function (request, merchantRefCode, requestId, paymentType) {
        var ccCreditService = new CybersourceHelper.getcsReference().CCCreditService();
        ccCreditService.captureRequestID = requestId;
        request.ccCreditService = ccCreditService;
        request.paymentSolution = paymentType;
        request.ccCreditService.run = true;
    },

    /** ***************************************************************************
     * Name: aliPayRefund/CreditService
     * Description: Initiate the Refund/Credit for transactionId .
     *    5446045635766630804009
     *************************************************************************** */
    aliPayRefundService: function (request, requestId, paymentType) {
        var aliPayRefundService = new CybersourceHelper.getcsReference().APRefundService();
        aliPayRefundService.apInitiateRequestID = requestId;
        request.apRefundService = aliPayRefundService;
        request.apPaymentType = paymentType;
        request.apRefundService.run = true;
    },

    /** ***************************************************************************
     * Name: banktransferRefundService/CreditService
     * Description: Initiate the Refund/Credit for transactionId .
     *
     *************************************************************************** */
    banktransferRefundService: function (request, merchantRefCode, requestId, paymentType) {
        var banktransferRefundService = new CybersourceHelper.getcsReference().APRefundService();
        banktransferRefundService.refundRequestID = requestId;
        request.apRefundService = banktransferRefundService;
        request.apPaymentType = paymentType;
        request.apRefundService.run = true;
    },
    
     /** ***************************************************************************
     * Name: DecisionManager
     * Description: DecisionManagerService.
     *
     *************************************************************************** */
    apDecisionManagerService: function (paymentMethodID, request, billTo, shipTo, purchase, refCode, enableDeviceFingerprint, itemsCybersource) {
        var PaymentMgr = require('dw/order/PaymentMgr');
        var CybersourceConstants = require('*/cartridge/scripts/utils/CybersourceConstants');
        var paymentProcessorID = PaymentMgr.getPaymentMethod(paymentMethodID).paymentProcessor.ID;
        request.decisionManager = new CybersourceHelper.getcsReference().DecisionManager();
        var flag = false;
        if (CybersourceConstants.BANK_TRANSFER_PROCESSOR.equals(paymentProcessorID)) {
            request.decisionManager.enabled = CybersourceHelper.getBankTransferDecisionManagerFlag();
            request.afsService = new CybersourceHelper.getcsReference().AFSService();
            request.afsService.run = true;
        } else if (CybersourceConstants.METHOD_PAYPAL.equals(paymentMethodID) || CybersourceConstants.METHOD_PAYPAL_CREDIT.equals(paymentMethodID)) {
            request.decisionManager.enabled = CybersourceHelper.getPayPapDMEnableFlag();
            flag = CybersourceHelper.getPayPapDMEnableFlag();
        } else if (CybersourceConstants.METHOD_VISA_CHECKOUT.equals(paymentMethodID)) {
            request.decisionManager.enabled = CybersourceHelper.getCardDecisionManagerEnable();
            flag = CybersourceHelper.getCardDecisionManagerEnable();
        } else {
            request.merchantID = CybersourceHelper.getMerchantID();
            var fingerprint = null;
            if (enableDeviceFingerprint) {
                fingerprint = replaceCharsInSessionID(session.sessionID);
            }

            setClientData(request, refCode, fingerprint);
            if (billTo !== null) {
                request.billTo = copyBillTo(billTo);
            }
            request.shipTo = copyShipTo(shipTo);
            request.purchaseTotals = copyPurchaseTotals(purchase);
            var items = [];
            if (itemsCybersource !== null) {
                var iter = itemsCybersource.iterator();
                while (iter.hasNext()) {
                    items.push(copyItemFrom(iter.next()));
                }
            }

            request.item = items;

            request.decisionManager.enabled = CybersourceHelper.getCardDecisionManagerEnable();
            flag = CybersourceHelper.getCardDecisionManagerEnable();
        }
        // DM standalone
        if(flag){
            request.afsService = new CybersourceHelper.getcsReference().AFSService();
            request.afsService.run = true;
        }
    },

    /**
     * Sets APSaleService parameters
     * @param {*} saleObject saleObject
     * @param {*} request request
     */
    postPreAuth: function (saleObject, request) {
        var apSaleService = new CybersourceHelper.getcsReference().APSaleService();
        apSaleService.cancelURL = saleObject.cancelURL;
        apSaleService.successURL = saleObject.successURL;
        apSaleService.failureURL = saleObject.failureURL;

        if (saleObject.paymentOptionID) {
            apSaleService.paymentOptionID = saleObject.paymentOptionID;
        }

        request.apSaleService = apSaleService;

        // set run instance to true
        request.apSaleService.run = true;
    }
};

module.exports = {
    getCybersourceHelper: getCybersourceHelper,
    copyTaxAmounts: copyTaxAmounts,
    setClientData: setClientData,
    copyPurchaseTotals: copyPurchaseTotals,
    copyBillTo: copyBillTo,
    copyShipTo: copyShipTo,
    copyItemFrom: copyItemFrom,
    copyCard: copyCreditCard,
    replaceCharsInSessionID: replaceCharsInSessionID
};
