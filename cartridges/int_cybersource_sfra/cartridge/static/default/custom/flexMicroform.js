"use strict";$(document).ready((function(){if(0!=$("#flextokenObj").length){var e=JSON.parse($("#flextokenRespose").val()).keyId,a=new Flex(e),r=($("#credit-card-content.cardNumber").attr("data-cardNumber"),a.microform({styles:{input:{"font-family":'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"',"font-size":"1rem","line-height":"1.5",color:"#495057"},":focus":{color:"blue"},":disabled":{cursor:"not-allowed"},valid:{color:"#3c763d"},invalid:{color:"#a94442"}}})),t=r.createField("number");function o(){var e=$("#expirationMonth").val()||$("#month").val(),a=$("#expirationYear").val()||$("#year").val();if(""==e||""==a)return!1;var t={expirationMonth:1==e.length?"0"+e:e,expirationYear:a};return r.createToken(t,(function(e,a){if(e)return $(".card-number-wrapper .invalid-feedback").text(e.message).css("display","block"),!0;var r,t,o=(r=a.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"),t=decodeURIComponent(atob(r).split("").map((function(e){return"%"+("00"+e.charCodeAt(0).toString(16)).slice(-2)})).join("")),JSON.parse(t));document.getElementById("cardNumber").valid=!0,$("#flex-response").val(o.jti),$("#cardNumber").val(o.data.number),$("#cardType").val(o.data.type),1===$(".submit-payment").length?$(".submit-payment").trigger("click"):$(".save-payment").trigger("click")})),!0}function n(){var e=$("#cardType").val();if(e.charCodeAt(0)!==e.toUpperCase().charCodeAt(0)){var a="";switch(e){case"visa":a="Visa";break;case"mastercard":a="Master Card";break;case"amex":a="Amex";break;case"discover":a="Discover";break;case"diners-club":a="DinersClub";break;case"maestro":a="Maestro";break;case"jcb":a="JCB"}$("#cardType").val(a)}}r.createField("securityCode").load("#securityCode-container"),t.load("#cardNumber-container"),t.on("change",(function(e){var a=e.card[0].name;$(".card-number-wrapper").attr("data-type",a),$("#cardType").val(a)})),$(".payment-summary .edit-button").on("click",(function(){$("#flex-response").val("")})),$(".submit-payment").on("click",(function(e){""===$("#expirationMonth").val()||""===$("#expirationYear").val()||""!==$("#flex-response").val()&&void 0!==$("#flex-response").val()||!("guest"===$(".data-checkout-stage").data("customer-type")||"registered"===$(".data-checkout-stage").data("customer-type")&&$(".payment-information").data("is-new-payment"))||""!==$("#flex-response").val()&&void 0!==$("#flex-response").val()||(o(),n(),e.stopImmediatePropagation())})),$(".save-payment").on("click",(function(e){""!==$("#flex-response").val()&&void 0!==$("#flex-response").val()||(o(),n(),e.preventDefault())}))}}));