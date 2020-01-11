'use strict';

var serverMock = {
    forms: {
        getForm: function (formName) {
            return {
                formName: formName,
                clear: function () { },
                copyFrom: function (obj) {
                    Object.keys(obj).forEach(function (key) {
                        this[key] = obj[key];
                    }, this);
                }
            };
        }
    }
};

module.exports = serverMock;
