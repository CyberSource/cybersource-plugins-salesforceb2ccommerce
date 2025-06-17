// var scrollAnimate = require('base/components/scrollAnimate');


var Klarna = {
    initStages: {},
    currentStage: null,
};


window.klarnaAsyncCallback = function () {
    $(function () {
        Klarna.init();
    });
};

/**
 * Initialize Klarna.
 *
 * SFRA checkout consists of shipping, payment, place order stages.
 *
 */
Klarna.init = function () {
    setInterval(function () {
        var currentStage = $('.data-checkout-stage').attr('data-checkout-stage');

        if (this.currentStage !== currentStage) {
            this.handleStageChange(currentStage);

            this.currentStage = currentStage;
        }
    }.bind(this), 100);
};

/**
 * Handle checkout stage changed.
 *
 * @param {string} newStage - ID of new stage.
 */
Klarna.handleStageChange = function (newStage) {

    if (typeof this.initStages[newStage] === 'undefined' || !this.initStages[newStage]) {
        try {
            this.initStage(newStage);
        } catch (e) {
            console.debug(e); // eslint-disable-line
        }

        this.initStages[newStage] = true;
    }
};

Klarna.initStage = function (stage) {
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


Klarna.shippingStage = function (defer) {
    defer.resolve();
};

Klarna.paymentStage = function (defer) {
    if (isSessionExists()) {
        Klarna.Payments.init({
            client_token: window.klarnaVariables.klarnaClientToken
        });
        Klarna.Payments.load({ container: '#klarna-container' }, function (res) {
            if (res.show_form === true) {
                console.log('Klarna Credit form is shown');
            }
        });

        this.handleKlarnaSubmitPaymentButton(defer);
        defer.resolve();
    }
};

Klarna.placeOrderStage = function (defer) {
    Klarna.Payments.init({
        client_token: window.klarnaVariables.klarnaClientToken
    });

    this.handleKlarnaPlaceOrderButton(defer);

    defer.resolve();
};


/**
 * Handle Klarna submit payment button.
 *
 *
 */
Klarna.handleKlarnaSubmitPaymentButton = function (defer) {
    var $submitPaymentBtn = $('.submit-payment');
    var $klarnaSubmitPaymentBtn = $('.klarna-submit-payment');

    if (window.klarnaVariables.KlarnaIsExpressCheckout === 'true') {
        $klarnaSubmitPaymentBtn.on('click', function () {
            $submitPaymentBtn.click();
        });
    } else {
        this.initKlarnaCheckoutFlow($klarnaSubmitPaymentBtn, defer);
    }
};

Klarna.handleKlarnaPlaceOrderButton = function (defer) {
    var $placeOrderBtn = $('.submit-order.klarna');
    if ($placeOrderBtn.length === 0) {
        $placeOrderBtn = $('.klarna');
    }

    $placeOrderBtn.on('click', function (event) {
        if ($placeOrderBtn.is('.submit-order.klarna') || $placeOrderBtn.is('.klarna')) {
            event.stopPropagation();
            $placeOrderBtn.prop('disabled', true);
            this.updateSession(defer);
        }
    }.bind(this));
};

Klarna.updateSession = function (defer) {
    $.spinner().start();

    $.ajax({
        url: window.klarnaVariables.updateSessionEndpoint,
        data: {},
        type: 'POST'
    }).done(function (data) {
        $.spinner().stop();

        if (!data.error) {
            var finalizeRequired = window.klarnaVariables.KlarnaIsFinalizeRequired;
            if (finalizeRequired === 'true') {
                this.handleKlarnaFinalizeFlow(defer);
            }
            else {
                this.handleNonFinalizeFlow(defer);
            }
        }
        else {
            this.displayPlaceOrderError(data);
        }
    }.bind(this));
}

Klarna.handleNonFinalizeFlow = function (defer) {
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

Klarna.handleKlarnaFinalizeFlow = function (defer) {
    var $placeOrderBtn = $('.submit-order.klarna');
    if ($placeOrderBtn.length === 0) {
        $placeOrderBtn = $('.klarna');
    }
    Klarna.Payments.finalize({}, {}, function (res) {
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

Klarna.displayPlaceOrderError = function (data) {
    if (data.errorMessage) {
        $('.error-message').show();
        $('.error-message-text').text(data.errorMessage);
        // scrollAnimate($('.error-message'));
    }
};

Klarna.initKlarnaCheckoutFlow = function (klarnaButton, defer) {
    var $submitPaymentBtn = $('.submit-payment');

    klarnaButton.on('click', function (event) {
        Klarna.Payments.authorize({
            payment_method_category: 'klarna',
            auto_finalize: false
        }, {}, function (res) {
            if (res.approved) {
                if (res.finalize_required == true) {
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
                }.bind(this));
            } else if (res.show_form) {
                klarnaButton.prop('disabled', false);
            }
        }.bind(this));
    }.bind(this));
};