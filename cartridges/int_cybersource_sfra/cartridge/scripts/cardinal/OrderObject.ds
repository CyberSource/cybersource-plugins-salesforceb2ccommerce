/**
* Description of the module and the logic it provides
*
* @module cartridge/scripts/cardinal/OrderObject
*/

'use strict';

function OrderObject()
{
	this.Authorization="";
	this.Cart="";
	this.Consumer="";
	this.Options="";
	this.OrderDetails="";
	this.Token="";
}

OrderObject.prototype = {
	
	setAuthorization : function(value){
		this.Authorization = {"AuthorizeAccount": value};
	},
	setCart : function(value){
		this.Cart = value;
	},
	setConsumer : function(value){
		this.Consumer = value;
	},
	setOptions : function(value){
		this.Options = {"EnableCCA": value};
	},
	setToken : function(value){
		this.Token = value;
	},
	setOrderDetails : function(value){
		this.OrderDetails = value;
	}
}
module.exports=OrderObject;