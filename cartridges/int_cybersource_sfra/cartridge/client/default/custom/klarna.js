'use strict';

/**
 * Klarna Payments - Unified client-side JavaScript
 * Handles both express checkout (cart/minicart) and checkout page payment flows
 */

// ============================================================================
// KLARNA HELPER OBJECT - Checkout Flow Management
// ============================================================================

var KlarnaHelper = {
    initStages: {},
    currentStage: null,
    grandTotalSum: null
};

/**
 * Initialize Klarna checkout stage tracking.
 * SFRA checkout consists of shipping, payment, place order stages.
 */
KlarnaHelper.init = function () {
    setInterval(function () {
        var currentStage = $('.data-checkout-stage').attr('data-checkout-stage');
        var currentGrandTotal = String($('.grand-total-sum').text()).trim();
        this.grandTotalSum = currentGrandTotal;

        if (this.currentStage !== currentStage) {
            this.handleStageChange(currentStage);
            this.currentStage = currentStage;
        }
    }.bind(this), 100);
};

/**
 * Handle checkout stage changed.
 * @param {string} newStage - ID of new stage.
 */
KlarnaHelper.handleStageChange = function (newStage) {
    if (typeof this.initStages[newStage] === 'undefined' || !this.initStages[newStage]) {
        try {
            this.initStage(newStage);
        } catch (e) {
            console.debug(e); // eslint-disable-line
        }
        this.initStages[newStage] = true;
    }
};

KlarnaHelper.initStage = function (stage) {
    var defer = $.Deferred(); // eslint-disable-line

    switch (stage) {
        case 'shipping':
            this.shippingStage(defer);
            break;
        case 'payment':
            this.paymentStage(defer);
            break;
        case 'placeOrder':
            this.placeOrderStage(defer);
            break;
        default:
            break;
    }

    return defer;
};

KlarnaHelper.shippingStage = function (defer) {
    defer.resolve();
};

KlarnaHelper.paymentStage = function (defer) {
    if (isSessionExists()) {
        window.Klarna.Payments.init({
            client_token: window.klarnaVariables.klarnaClientToken
        });
        window.Klarna.Payments.load({ container: '#klarna-container' }, function (res) {
            if (res.show_form === true) {
                console.log('Klarna Credit form is shown');
            }
        });

        this.handleKlarnaSubmitPaymentButton(defer);
        defer.resolve();
    }
};

KlarnaHelper.placeOrderStage = function (defer) {
    window.Klarna.Payments.init({
        client_token: window.klarnaVariables.klarnaClientToken
    });

    this.handleKlarnaPlaceOrderButton(defer);
    defer.resolve();
};

/**
 * Handle Klarna submit payment button.
 */
KlarnaHelper.handleKlarnaSubmitPaymentButton = function (defer) {
    var $submitPaymentBtn = $('.submit-payment');
    var $klarnaSubmitPaymentBtn = $('.klarna-submit-payment');

    $klarnaSubmitPaymentBtn.on('click', function () {
        // Track grand total sum changes
        var currentGrandTotal = String($('.grand-total-sum').text()).trim();
        if (this.grandTotalSum !== null && this.grandTotalSum !== currentGrandTotal) {
            window.klarnaGrandTotalChanged = true;
        }
        this.grandTotalSum = currentGrandTotal;

        if (window.klarnaVariables.KlarnaIsExpressCheckout === 'true') {
            $submitPaymentBtn.click();
        } else {
            KlarnaHelper.updateSession(defer, true);
        }
    }.bind(this));
};

KlarnaHelper.handleKlarnaPlaceOrderButton = function (defer) {
    var $placeOrderBtn = $('.submit-order.klarna');
    if ($placeOrderBtn.length === 0) {
        $placeOrderBtn = $('.klarna');
    }

    $placeOrderBtn.on('click', function (event) {
        if ($placeOrderBtn.is('.submit-order.klarna') || $placeOrderBtn.is('.klarna')) {
            event.stopPropagation();
            $placeOrderBtn.prop('disabled', true);
            if (window.klarnaVariables.KlarnaIsExpressCheckout === 'true') {
                this.updateSession(defer, false);
            } else {
                var finalizeRequired = window.klarnaVariables.KlarnaIsFinalizeRequired;
                if (finalizeRequired === 'true') {
                    this.handleKlarnaFinalizeFlow(defer);
                } else {
                    this.handleNonFinalizeFlow(defer);
                }
            }
        }
    }.bind(this));
};

KlarnaHelper.updateSession = function (defer, isKlarnaCheckoutPage) {
    if (window.klarnaGrandTotalChanged === false || window.klarnaSessionFromCheckout === true) {
        window.klarnaSessionFromCheckout = false;
        this.initKlarnaCheckoutFlow(defer);
    } else {
        window.klarnaGrandTotalChanged = false;
        $.spinner().start();
        $.ajax({
            url: window.klarnaVariables.updateSessionEndpoint,
            data: {},
            type: 'POST'
        }).done(function (data) {
            $.spinner().stop();
            if (!isKlarnaCheckoutPage) {
                if (!data.error) {
                    var finalizeRequired = window.klarnaVariables.KlarnaIsFinalizeRequired;
                    if (finalizeRequired === 'true') {
                        this.handleKlarnaFinalizeFlow(defer);
                    } else {
                        this.handleNonFinalizeFlow(defer);
                    }
                } else {
                    this.displayPlaceOrderError(data);
                }
            } else {
                this.initKlarnaCheckoutFlow(defer);
            }
        }.bind(this));
    }
};

KlarnaHelper.handleNonFinalizeFlow = function (defer) {
    var $placeOrderBtn = $('.submit-order.klarna');
    if ($placeOrderBtn.length === 0) {
        $placeOrderBtn = $('.klarna');
    }
    $('body').spinner().start();

    $.ajax({
        url: $placeOrderBtn.data('action'),
        method: 'POST',
        success: function (data) {
            $('body').spinner().stop();

            if (data.error) {
                if (data.cartError) {
                    window.location.href = data.redirectUrl;
                    defer.reject();
                } else {
                    defer.reject(data);
                    this.displayPlaceOrderError(data);
                }
            } else {
                var continueUrl = data.continueUrl;
                window.location.href = continueUrl;
                defer.resolve(data);
            }
        }.bind(this),
        error: function () {
            $('body').spinner().stop();
        }
    });
};

KlarnaHelper.handleKlarnaFinalizeFlow = function (defer) {
    var $placeOrderBtn = $('.submit-order.klarna');
    if ($placeOrderBtn.length === 0) {
        $placeOrderBtn = $('.klarna');
    }
    window.Klarna.Payments.finalize({}, {}, function (res) {
        if (res.approved) {
            $.ajax({
                headers: {
                    'X-Auth': res.authorization_token
                },
                url: window.klarnaVariables.saveKlarnaAuthDetails
            }).done(function () {
                $('body').spinner().start();

                $.ajax({
                    url: $placeOrderBtn.data('action'),
                    method: 'POST',
                    success: function (data) {
                        $('body').spinner().stop();
                        if (data.error) {
                            if (data.cartError) {
                                window.location.href = data.redirectUrl;
                                defer.reject();
                            } else {
                                defer.reject(data);
                                this.displayPlaceOrderError(data);
                            }
                        } else {
                            var continueUrl = data.continueUrl;
                            window.location.href = continueUrl;
                            defer.resolve(data);
                        }
                    }.bind(this),
                    error: function () {
                        $('body').spinner().stop();
                    }
                });
            }.bind(this));
        } else {
            console.error('Klarna Payments finalize failed: ', res);
        }
    }.bind(this));
};

KlarnaHelper.displayPlaceOrderError = function (data) {
    if (data.errorMessage) {
        $('.error-message').show();
        $('.error-message-text').text(data.errorMessage);
    }
};

KlarnaHelper.initKlarnaCheckoutFlow = function (defer) {
    var $submitPaymentBtn = $('.submit-payment');
    var klarnaButton = $('.klarna-submit-payment');

    window.Klarna.Payments.authorize({
        payment_method_category: 'klarna',
        auto_finalize: false
    }, {}, function (res) {
        if (res.approved) {
            if (res.finalize_required === true) {
                window.klarnaVariables.KlarnaIsFinalizeRequired = 'true';
            }
            $.ajax({
                headers: {
                    'X-Auth': res.authorization_token,
                    'Finalize-Required': res.finalize_required
                },
                url: window.klarnaVariables.saveKlarnaAuthDetails
            }).done(function () {
                $submitPaymentBtn.click();
            });
        } else if (res.show_form) {
            klarnaButton.prop('disabled', false);
        }
    });
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Check if Klarna session exists
 * @returns {boolean} - Whether a valid session token exists
 */
function isSessionExists() {
    return typeof window.klarnaVariables !== 'undefined' &&
           typeof window.klarnaVariables.klarnaClientToken !== 'undefined' &&
           window.klarnaVariables.klarnaClientToken !== 'null' &&
           window.klarnaVariables.klarnaClientToken !== '';
}

/**
 * Handle Klarna initialization for cart/minicart
 * Attached to window for access from miniCart.js
 * @param {boolean} isCheckoutPage - Whether this is the checkout page
 */
window.handleKlarna = function handleKlarna(isCheckoutPage) {
    window.miniCartButtonLoaded = false;

    if (isSessionExists()) {
        klarnaExpressAsyncCallback(window.klarnaVariables.klarnaClientToken);
    } else {
        requestSession(isCheckoutPage);
    }
};

/**
 * Request Klarna session from server
 * @param {boolean} isCheckoutPage - Whether this is the checkout page
 */
function requestSession(isCheckoutPage) {
    var endpoint = window.klarnaVariables.createSessionEndpoint;
    if (isCheckoutPage) {
        $.spinner().start();
    }
    $.ajax({
        url: endpoint,
        method: 'POST',
        data: null,
        success: function (data) {
            if (isCheckoutPage) {
                $.spinner().stop();
            }
            if (data.reasonCode !== 100 || data.decision === 'REJECT') {
                console.log('Error creating klarna session: ', data);
                $('#klarna-error-message').show();
                $('#klarna-submit-paymentButton').hide();
            } else {
                if (data.sessionToken) {
                    window.klarnaVariables.klarnaClientToken = data.sessionToken;
                    if (isCheckoutPage === false) {
                        klarnaExpressAsyncCallback(data.sessionToken);
                    } else {
                        window.klarnaSessionFromCheckout = true;
                        $('#klarna-submit-paymentButton').show();
                        KlarnaHelper.paymentStage($.Deferred());
                    }
                }
            }
        },
        error: function (err) {
            if (isCheckoutPage) {
                $('#klarna-error-message').show();
                $.spinner().stop();
            }
            console.log('Error creating klarna session: ', err);
        }
    });
}

// ============================================================================
// EXPRESS CHECKOUT (Cart/Minicart)
// ============================================================================

/**
 * Klarna async callback for express checkout buttons
 * @param {string} sessionToken - The Klarna session token
 */
function klarnaExpressAsyncCallback(sessionToken) {
    var klarnaExpressCheckoutMC = document.querySelector('#klarnaExpressCheckoutMC');
    var klarnaExpressCheckoutCart = document.querySelector('#klarnaExpressCheckoutCart');

    sessionToken = window.klarnaVariables.klarnaClientToken;
    if (klarnaExpressCheckoutMC && window.miniCartButtonLoaded !== true && isSessionExists()) {
        initKlarnaExpressButton('#klarnaExpressCheckoutMC', sessionToken);
    }
    if (klarnaExpressCheckoutCart && window.cartButtonLoaded !== true && isSessionExists()) {
        initKlarnaExpressButton('#klarnaExpressCheckoutCart', sessionToken);
    }
}

/**
 * Initialize Klarna Express Checkout button
 * @param {string} containerId - The container element ID
 * @param {string} sessionToken - The Klarna session token
 */
function initKlarnaExpressButton(containerId, sessionToken) {
    window.Klarna.Payments.Buttons.init({
        client_token: sessionToken
    }).load({
        container: containerId,
        locale: window.klarnaVariables.currentLocale,
        on_click: function (authorize) {
            authorize(
                { collect_shipping_address: true, auto_finalize: false },
                null,
                function (result) {
                    if (result.approved) {
                        $.ajax({
                            url: window.klarnaVariables.handleExpressCheckoutAuth,
                            type: 'post',
                            dataType: 'json',
                            contentType: 'application/json',
                            data: JSON.stringify(result),
                            success: function (data) {
                                if (data.redirectUrl) {
                                    window.location.href = data.redirectUrl;
                                }
                            }
                        });
                    } else {
                        console.log('Klarna error: ', result);
                    }
                }
            );
        }
    }, function loadCallback(loadResult) {
        if (containerId === '#klarnaExpressCheckoutMC') {
            window.miniCartButtonLoaded = true;
        } else if (containerId === '#klarnaExpressCheckoutCart') {
            window.cartButtonLoaded = true;
        }
        console.log('Klarna widget loaded:', loadResult);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Klarna async callback - called when Klarna SDK is ready
 * Used for checkout page initialization
 */
// window.klarnaAsyncCallback = function () {
//     $(function () {
//         KlarnaHelper.init();
//     });
// };

/**
 * Document ready handler
 */
$(function () {
    $('#klarna-error-message').hide();
    KlarnaHelper.init();

    // Checkout page - Klarna tab click handler
    var $klarnaTab = $('#klarna-tab-checkout');
    if ($klarnaTab.length !== 0) {
        $klarnaTab.on('click', function () {
            $('#klarna-error-message').hide();
            if (!isSessionExists()) {
                requestSession(true); // isCheckoutPage = true
            }
        });
    }

    // Cart page - Initialize Klarna express checkout
    var $divElement = $('#checkout-actions');
    if ($divElement.length !== 0) {
        window.handleKlarna(false); // isCheckoutPage = false
    }
});
