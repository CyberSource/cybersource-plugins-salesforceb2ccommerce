'use strict';
var cart = require('base/cart/cart');

module.exports = function () {
    cart();
    $('.minicart').on('count:update', function (event, count) {
        if (count && $.isNumeric(count.quantityTotal)) {
            $('.minicart .minicart-quantity').text(count.quantityTotal);
        }
    });

   $('.minicart').off('mouseenter focusin touchstart').on('mouseenter focusin touchstart', function (event) {
        if ($('.search:visible').length === 0) {
            return;
        }
        var url = $('.minicart').data('action-url');
        var count = parseInt($('.minicart .minicart-quantity').text(), 10);
        if (count !== 0 && $('.minicart .popover.show').length === 0) {
            $('.minicart .popover').addClass('show');
            $('.minicart .popover').spinner().start();
            $.get(url, function (data) {
                $('.minicart .popover').empty();
                $('.minicart .popover').append(data);

                var isPaypalEnabled = $('#paypal_enabled').length>0 && document.getElementById("paypal_enabled").value == 'true' ? true : false;
                var isGooglePayEnabled = $('#isGooglePayEnabled').length>0 && $('#isGooglePayEnabled').val() == 'true' ? true : false;
                
                if(isPaypalEnabled) {
                    paypalhelper.paypalMini();
                }
                if(isGooglePayEnabled){
					onGooglePayLoaded();
                }
                
                $.spinner().stop();
            });
        }
        event.stopImmediatePropagation();
    });
    $('body').on('touchstart click', function (e) {
        if ($('.minicart').has(e.target).length <= 0) {
            $('.minicart .popover').empty();
            $('.minicart .popover').removeClass('show');
        }
    });
    
    $('.minicart').on('mouseleave focusout', function (event) {
        if ((event.type === 'focusout' && $('.minicart').has(event.target).length > 0)
            || (event.type === 'mouseleave' && $(event.target).is('.minicart .quantity'))
            || $('body').hasClass('modal-open')) {
            event.stopPropagation();
            return;
        }else {
        	if(!($(document).find('.paypal-checkout-sandbox').length > 0)) {
        		$('.minicart .popover').empty();
        		$('.minicart .popover').removeClass('show');
        	}
		}
		event.stopImmediatePropagation();
    });
    $('body').on('change', '.minicart .quantity', function () {
        if ($(this).parents('.bonus-product-line-item').length && $('.cart-page').length) {
            location.reload();
        }
    });
};
