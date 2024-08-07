'use strict';

/**
* CybersourceBillToObject.js
* This Object is used for the Cybersource BillTo xsd complex type
*/
function BillToObject() {
    this.title = '';
    this.firstName = '';
    this.middleName = '';
    this.lastName = '';
    this.suffix = '';
    this.street1 = '';
    this.street2 = '';
    this.street3 = '';
    this.street4 = '';
    this.city = '';
    this.county = '';
    this.state = '';
    this.postalCode = '';
    this.country = '';
    this.company = '';
    this.companyTaxID = '';
    this.phoneNumber = '';
    this.email = '';
    this.ipAddress = '';
    this.ipNetworkAddress = '';
    this.hostname = '';
    this.domainName = '';
    this.dateOfBirth = '';
    this.driversLicenseNumber = '';
    this.driversLicenseState = '';
    this.ssn = '';
    this.customerID = '';
    this.httpBrowserType = '';
    this.httpBrowserEmail = '';
    this.httpBrowserCookiesAccepted = true;
    this.httpBrowserScreenHeight = '';
    this.httpBrowserScreenWidth = '';
    this.nif = '';
    this.personalID = '';
    this.language = '';
    this.district = '';
}

BillToObject.prototype = {
    setTitle: function (value) {
        this.title = value;
    },
    getTitle: function () {
        return this.title;
    },
    setFirstName: function (value) {
        this.firstName = value;
    },
    getFirstName: function () {
        return this.firstName;
    },
    setMiddleName: function (value) {
        this.middleName = value;
    },
    getMiddleName: function () {
        return this.middleName;
    },
    setLastName: function (value) {
        this.lastName = value;
    },
    getLastName: function () {
        return this.lastName;
    },
    setSuffix: function (value) {
        this.suffix = value;
    },
    getSuffix: function () {
        return this.suffix;
    },
    setStreet1: function (value) {
        this.street1 = value;
    },
    getStreet1: function () {
        return this.street1;
    },
    setStreet2: function (value) {
        this.street2 = value;
    },
    getStreet2: function () {
        return this.street2;
    },
    setStreet3: function (value) {
        this.street3 = value;
    },
    getStreet3: function () {
        return this.street3;
    },
    setStreet4: function (value) {
        this.street4 = value;
    },
    getStreet4: function () {
        return this.street4;
    },
    setCity: function (value) {
        this.city = value;
    },
    getCity: function () {
        return this.city;
    },
    setCounty: function (value) {
        this.county = value;
    },
    getCounty: function () {
        return this.county;
    },
    setState: function (value) {
        this.state = value;
    },
    getState: function () {
        return this.state;
    },
    setPostalCode: function (value) {
        this.postalCode = value;
    },
    getPostalCode: function () {
        return this.postalCode;
    },
    setCountry: function (value) {
        this.country = value;
    },
    getCountry: function () {
        return this.country;
    },
    setCompany: function (value) {
        this.company = value;
    },
    getCompany: function () {
        return this.company;
    },
    setCompanyTaxID: function (value) {
        this.companyTaxID = value;
    },
    getCompanyTaxID: function () {
        return this.companyTaxID;
    },
    setPhoneNumber: function (value) {
        this.phoneNumber = value;
    },
    getPhoneNumber: function () {
        return this.phoneNumber;
    },
    setEmail: function (value) {
        this.email = value;
    },
    getEmail: function () {
        return this.email;
    },
    setIpAddress: function (value) {
        this.ipAddress = value;
    },
    getIpAddress: function () {
        return this.ipAddress;
    },
    setIpNetworkAddress: function (value) {
        this.ipNetworkAddress = value;
    },
    getIpNetworkAddress: function () {
        return this.ipNetworkAddress;
    },
    setHostName: function (value) {
        this.hostName = value;
    },
    getHostName: function () {
        return this.hostName;
    },
    setDomainName: function (value) {
        this.domainName = value;
    },
    getDomainName: function () {
        return this.domainName;
    },
    setDateOfBirth: function (value) {
        this.dateOfBirth = value;
    },
    getDateOfBirth: function () {
        return this.dateOfBirth;
    },
    setDriversLicenseNumber: function (value) {
        this.driversLicenseNumber = value;
    },
    getDriversLicenseNumber: function () {
        return this.driversLicenseNumber;
    },
    setDriversLicenseState: function (value) {
        this.driversLicenseState = value;
    },
    getDriversLicenseState: function () {
        return this.driversLicenseState;
    },
    setSsn: function (value) {
        this.ssn = value;
    },
    getSsn: function () {
        return this.ssn;
    },
    setCustomerID: function (value) {
        this.customerID = value;
    },
    getCustomerID: function () {
        return this.customerID;
    },
    setHttpBrowserType: function (value) {
        this.httpBrowserType = value;
    },
    getHttpBrowserType: function () {
        return this.httpBrowserType;
    },
    setHttpBrowserEmail: function (value) {
        this.httpBrowserEmail = value;
    },
    getHttpBrowserEmail: function () {
        return this.httpBrowserEmail;
    },
    setHttpBrowserCookiesAccepted: function (value) {
        this.httpBrowserCookiesAccepted = value;
    },
    getHttpBrowserCookiesAccepted: function () {
        return this.httpBrowserCookiesAccepted;
    },
    getHttpBrowserScreenHeight : function() {
        return this.httpBrowserScreenHeight;
    },
    setHttpBrowserScreenHeight: function (value) {
        this.httpBrowserScreenHeight = value;
    },
    getHttpBrowserScreenWidth : function() {
        return this.httpBrowserScreenWidth;
    },
    setHttpBrowserScreenWidth: function (value) {
        this.httpBrowserScreenWidth = value;
    },
    setNif: function (value) {
        this.nif = value;
    },
    getNif: function () {
        return this.nif;
    },
    setPersonalID: function (value) {
        this.personalID = value;
    },
    getPersonalID: function () {
        return this.personalID;
    },
    setLanguage: function (value) {
        this.language = value;
    },
    getLanguage: function () {
        return this.language;
    },
    setDistrict: function (value) {
        this.district = value;
    },
    getDistrict: function () {
        return this.district;
    }
};
module.exports = BillToObject;
