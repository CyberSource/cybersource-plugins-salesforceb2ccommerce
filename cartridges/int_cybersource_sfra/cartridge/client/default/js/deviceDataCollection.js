'use strict';

window.onload = function() {
    var cardinalCollectionForm = document.querySelector('#cardinal_collection_form');
     if (cardinalCollectionForm) { // form exists
        cardinalCollectionForm.submit();
        console.log("DDC form submitted");
    }   
};
