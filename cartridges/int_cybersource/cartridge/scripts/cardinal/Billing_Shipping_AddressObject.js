'use strict';

function Billing_Shipping_AddressObject(){

	this.FullName="";
	this.FirstName="";
	this.MiddleName="";
	this.LastName="";
	this.Address1="";
	this.Address2="";
	this.Address3="";
	this.City="";
	this.State="";
	this.PostalCode="";
	this.CountryCode="";
	this.Phone1="";
	this.Phone2="";
}

Billing_Shipping_AddressObject.prototype = {
	
	setFullName : function(value){
	this.FullName = value;
	},
	setFirstName : function(value){
	this.FirstName = value;
	},
	setMiddleName : function(value){
	this.MiddleName = value;
	},
	setLastName : function(value){
	this.LastName = value;
	},
	setAddress1 : function(value){
	this.Address1 = value;
	},
	setAddress2 : function(value){
	this.Address2 = value;
	},
	setAddress3 : function(value){
	this.Address3 = value;
	},
	setCity : function(value){
	this.City = value;
	},
	setState : function(value){
	this.State = value;
	},
	setPostalCode : function(value){
	this.PostalCode = value;
	},
	setCountryCode : function(value){
	this.CountryCode = value;
	},
	setPhone1 : function(value){
	this.Phone1 = value;
	},
	setPhone2 : function(value){
	this.Phone2 = value;
	}
}
module.exports=Billing_Shipping_AddressObject;