'use strict';

var ddcSubmitted = false;

// addEventListener rather than window.onload assignment, so this neither clobbers
// nor gets clobbered by any other load handler registered on the page.
window.addEventListener('load', function () {
    if (ddcSubmitted) { // guard against a second POST to the collection URL
        return;
    }

    var cardinalCollectionForm = document.querySelector('#cardinal_collection_form');
    if (cardinalCollectionForm) { // form exists
        ddcSubmitted = true;
        cardinalCollectionForm.submit();
        console.log("DDC form submitted");
    }
});
