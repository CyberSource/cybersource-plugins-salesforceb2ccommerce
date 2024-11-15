
'use strict';

/* eslint-disable no-undef */
var totalServiceCalls = 1;

/**
 * function
 * @param {*} serviceCalls serviceCalls
 * @param {*} enforceError enforceError
 */
function weChatCheckStatus(serviceCalls, enforceError) {
    var orderNumber = document.getElementById('orderNo').value;
    var request = { orderNo: orderNumber };
    var weChatUrl = document.getElementById('weChatUrl').value;
    var weChatRedirectUrl = document.getElementById('weChatRedirectUrl').value;
    var noOfCalls = document.getElementById('noOfCalls').value;
    var serviceCallInterval = document.getElementById('serviceCallInterval').value;
    weChatUrl = encodeURIComponent(weChatUrl);
    weChatRedirectUrl = encodeURIComponent(weChatRedirectUrl);
    $.ajax({
        url: decodeURIComponent(weChatUrl),
        method: 'POST',
        data: request,
        async: false,
        dataType: 'json',
        success: function (data) {
            if (enforceError && !data.submit) {
                $('.modal').spinner().stop();
                window.location.href = decodeURIComponent(weChatRedirectUrl);
                return;
            }

            if (data.submit) {
                $('.modal').spinner().stop();
                window.location.href = data.redirectUrl;
            } else if (data.pending) {
                if (serviceCalls < noOfCalls) {
                    totalServiceCalls += 1;
                    if (delayTime === 'Long') {
                        setTimeout(function () { weChatCheckStatus(totalServiceCalls); }, serviceCallInterval * 5000);
                    } else if (delayTime === 'Short') {
                        setTimeout(function () { weChatCheckStatus(totalServiceCalls); }, serviceCallInterval * 1000);
                    }
                } else {
                    $('.modal').spinner().stop();
                    window.location.href = data.redirectUrl;
                }
            } else {
                $('.modal').spinner().stop();
                window.location.href = data.redirectUrl;
            }
        },
        // eslint-disable-next-line
        error: function (err) {
            $('.modal').spinner().stop();
            window.location.href = data.redirectUrl;
        }
    });
}

$('.wechat-close').on('click', function (e) {
    e.stopImmediatePropagation();
    document.getElementById('weChatClose').disabled = true;
    var noOfCalls = document.getElementById('noOfCalls').value;
    weChatCheckStatus(noOfCalls, true);
});

$('.wechat-confirm').on('click', function (e) {
    e.stopImmediatePropagation();
    $('.modal').spinner().start();
    document.getElementById('weChatConfirm').disabled = true;
    weChatCheckStatus(totalServiceCalls, false);
});
