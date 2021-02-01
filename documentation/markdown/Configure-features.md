## <ins>Configure Features (OPTIONAL)

1. Tax Calculation
2. Delivery Address Verification
3. Address Verification Service (AVS)
4. Device Fingerprint
5. Decision Manager
6. Payment Tokenization
7. Subscription Token Creation
8.  Capture Service
9. Auth Reversal Service
10. Credit Service
11. Request Customizations


### **1. Tax Calculation**

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_TaxConfiguration.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_TaxConfiguration** and set values for the parameter:

Field | Description
------------ | -------------
CS Tax Calculation Enabled | Enable or disable CyberSource tax service
CS Tax Calculation Nexus States List | List of states to charge tax in
CS Tax Calculation No Nexus States List | List of States to not charge tax in
CS Tax Calculation Default Product Tax Code | Default tax code used when tax code is not set on a product
CS Tax Calculation Purchase Order Acceptance City | Purchase order acceptance state code
CS Tax Calculation Purchase Order Acceptance Zip Code | Purchase order acceptance zip code
CS Tax Calculation Purchase Order Acceptance Country Code | Purchase order acceptance country code
CS Tax Calculation Purchase Order Origin City | Purchase order origin city
CS Tax Calculation Purchase Order Origin StateCode | Purchase order origin state code
CS Tax Calculation Purchase Order Origin ZipCode | Purchase order origin zip code
CS Tax Calculation Purchase Order Origin Country Code | Purchase order origin country code
CS Tax Calculation ShipFrom City | Ship from city
CS Tax Calculation ShipFrom StateCode | Ship from state code
CS Tax Calculation ShipFrom ZipCode | Ship from zip code
CS Tax Calculation ShipFrom Country Code | Ship from country code

### **2. Delivery Address Verification**

##### Implementation

Step 1: To enable this service, Go to **Merchant Tools > Custom Preferences > CyberSource: Core** and set the ‘CS DAV Delivery Address Verification Enabled’ preference to ‘Yes’.

Step 2: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_DeliveryAddressVerification.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 3: Go to **Merchant Tools > Custom Preferences > Cybersource_DeliveryAddressVerification** and set values for the parameter:

Field | Description
------------ | -------------
CS DAV Delivery Address Verification Enabled | Enable or disable the DAV service.
CS DAV Update Shipping Address With DAV Suggestion | Update the shipping address with the CS suggestion, if found.
CS DAV On Failure | Accept or Reject the order if DAV fails.

### **3. Address Verification Service (AVS)**

##### Implementation

Assuming you have implemented the Credit Card Authorization service, you are ready to use the AVS service.

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_DeliveryAddressVerification.xml**" in Business Manager (Administration > Site Development > Import & Export)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_DeliveryAddressVerification** and set values for the parameter:

FIeld | Description
------------ | -------------
CS AVS Ignore AVS Result | Effectively enables or disables the AVS service
CS AVS Decline Flags | Leave empty to follow CS default decline flag strategy Enter flags separated by commas to overwrite the default flag rules

### **4. Device Fingerprint**

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_DeviceFingerprint.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_DeviceFingerprint** and set values for the parameter:

Field | Description
------------ | -------------
CS Device Fingerprint Enabled | Enable or Disable the Device Fingerprint Service
CS Device Fingerprint Organization ID | Device Fingerprint Organization ID
CS Device Fingerprint ThreatMetrix URL | URL pointing to JS that generates and retrieves the fingerprint
CS Device Fingerprint Time To Live | Time, in milliseconds between generating a new fingerprint for any given customer session

### **5. Decision Manager**

Refer to this [link](https://www.cybersource.com/en-us/solutions/fraud-and-risk-management/decision-manager.html) to learn about Cybersource's Decision Manager.

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_DecisionManager.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_DecisionManager** and set values for the parameter:

Field | Description
------------ | -------------
CS Decision Manager Enabled | Enable or Disable Decision Manager

Step 3: SFRA storefront versions 3.2.0 or lower contain a hook that interfere with this service. While the hook manager has been updated in later versions of SFRA to prevent this, the CS cartridge is not yet compatible with those storefront versions. As suggested by SFCC, manual removal of the following hook from SFRA is required for this integration to function properly.
**Remove**
{
 "name": "app.fraud.detection",
 "script": "./cartridge/scripts/hooks/fraudDetection"
}
**From** app_storefront_base/hooks.json

Step 4: To enable **Decision Manager Order Update Job: Decision Manager Order Update Job** uses a REST API to retrieve order decisions from Cybersource and update the order confirmation status in SFCC.

To Integrate this job into your site, follow the below steps:

Step 4.1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import **“metadata/sfra_meta/jobs.xml”** in Business Manager (**Administration > Operations > Import & Export**)

Step 4.2: Navigate to **‘Administration > Operations > Job’**. Select the Job **‘CyberSource: Decision Manager Order Update’**.

Step 4.3: Select the “Job Steps” tab. Select the Sites you want the Job to run on, from the ‘Scope’ button.

Step 4.4: Select “UpdateOrderStatus” and update the following “custom parameters”.

Field | Description
------------ | -------------
MerchantId | CS Merchant ID for the account to get Decisions from
SAFlexKeyID | Key ID. Work with CS to generate this value
SAFlexSharedSecret | Shared secret. Work with CS to generate this value

Step 4.5: Navigate to the ‘Schedule and History’ tab and configure the frequency you would like the job to run.

Step 4.6: Ensure the ‘Enabled’ check box is selected.

Step 4.7: Go to Merchant Tools > Custom Preferences set values for the parameter:

Field | Site Pref Group | Description
------------ | ------------- | -------------
CS Decision Manager OrderUpdate Lookback time | Cybersource: Core | Number of hours the job will look back for new decisions. CS does not support lookbacks over 24 hours. Do not set above 24
Secure Acceptance Flex Host Name | Cybersource: Secure Acceptance | Host Name. CS can provide this value

Step 4.8: When moving to a production environment, the URL for the API call needs to be updated. This can be done in:
**Administration > Operations > Services > Service Credentials > ConversionDetailReport – Details**


### **6. Payment Tokenization**

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_Tokenization.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_Tokenization** and set values for the parameter:

Field | Description
------------ | -------------
CS Tokenization Enabled | Enable or Disable the Tokenization Service
LimitSavedCardRate | Limit number of credit card save attempts
SavedCardLimitFrame | Limit of card count in a certain time period
SavedCardLimitTimeFrame | Number of hours that saved credit card attempts are counted

### **7. Subscription Token Creation**

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_Tokenization.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > Cybersource_Tokenization** and set values for the parameter:

Field | Description
------------ | -------------
CS Subscription Tokens Enabled | Enable or Disable the option to generate subscription tokens

### **8. Capture Service**
Note: This section covers Capture service only for Credit Cards.

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_Core.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > CyberSource_Core** and Enter CyberSource Merchant ID, CyberSource Merchant Key values.

Step 3: The interface you will use to make capture requests is in the form of a single function:
CCCaptureRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency)
This function can be found in the script ‘scripts/facade/CardFacade.ds’.  A working example of how to use this function can be found in the CYBServicesTesting-CaptureService controller. You will first get an instance of the CardFacade object, and make the call as follows:
```
var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
var serviceResponse = CardFacade.CCCaptureRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
```
The resulting serviceResponse object will contain the full response object generated by the request. The contents of this object will determine your logic in handling errors and successes. For detailed explanations of all possible fields and values, reference the [Official CyberSource documentation for the CCCapture Service](https://developer.cybersource.com/api-reference-assets/index.html#payments_capture).

Step 4: Enter Capture Request Parameters:

Field | Description
------------ | -------------
requestID | Transaction ID obtained from the initial Authorization
merchantRefCode | SFCC Order Number
paymentType | Payment Type used for the Authorization
purchaseTotal | Order Total
currency | Currency code (ex. ‘USD’)

### **9. Auth Reversal Service**
Note: This section covers Reversal service only for Credit Cards.

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_Core.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > CyberSource_Core** and Enter CyberSource Merchant ID, CyberSource Merchant Key values.

Step 3: The interface you will use to make auth reversal requests is in the form of a single function:
CCAuthReversalService(requestID, merchantRefCode, paymentType,  currency, amount)
This function can be found in the script ‘scripts/facade/CardFacade.ds’.  A working example of how to use this function can be found in the CYBServicesTesting-CCAuthReversalService controller.  You will first get an instance of the CardFacade object, and make the call as follows:
```
var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
var serviceResponse = CardFacade.CCAuthReversalService (requestID, merchantRefCode, paymentType, currency, amount);
```
The resulting serviceResponse object will contain the full response object generated by the request.  The contents of this object will determine your logic in handling errors and successes.  For detailed explanations of all possible fields and values, reference the [Official CyberSource documentation for the CCAuthReversal Service](https://developer.cybersource.com/api-reference-assets/index.html#payments_reversal_process-an-authorization-reversal).

Step 4: Enter Authorization Reversal Request Parameter:

Field | Description
------------ | -------------
requestID | Transaction ID obtained from the initial Authorization
merchantRefCode | SFCC Order Number
paymentType | Payment Type used for the Authorization
amount | Order Total
currency | Currency code (ex. ‘USD’)

### **10. Credit Service**
Note: This section covers Credit service only for Credit Cards.

##### Implementation

Step 1: Upload Cybersource metadata in Business Manager. If not follow ["Step 2: Upload metadata"](CyberSource/documentation/markdown/Configure-cartridge.md#step-2-upload-metadata) or import "**metadata/sfra_meta/meta/Cybersource_Core.xml**" in Business Manager (**Administration > Site Development > Import & Export**)

Step 2: Go to **Merchant Tools > Custom Preferences > CyberSource_Core** and Enter CyberSource Merchant ID, CyberSource Merchant Key values.

Step 3: The interface you will use to make credit requests is in the form of a single function:
CCCreditRequest(requestID, merchantRefCode, paymentType, purchaseTotal, currency)
This function can be found in the script ‘scripts/facade/CardFacade.ds’.  A working example of how to use this function can be found in the CYBServicesTesting-CreditService controller.  You will first get an instance of the CardFacade object, and make the call as follows:
```
var CardFacade = require('~/cartridge/scripts/facade/CardFacade');
var serviceResponse = CardFacade.CCCreditRequest(requestID, merchantRefCode, paymentType, paymentTotal, currency);
```
The resulting serviceResponse object will contain the full response object generated by the request.  The contents of this object will determine your logic in handling errors and successes.  For detailed explanations of all possible fields and values, reference the Official CyberSource documentation for the CCCredit Service.

Step 4: Enter Credit Request Parameters:

Parameter Name | Description
------------ | -------------
requestID | Transaction ID obtained from the initial Authorization
merchantRefCode | SFCC Order Number
paymentType | Payment Type used for the Authorization
purchaseTotal | Order Total
currency | Currency code (ex. ‘USD’)


### **11. Request Customizations**

##### Implementation

Step 1: To customize request objects, register the hook ‘app.cybersource.modifyrequest’ in your cartridges ‘hooks.json’ file. An example would look like this, replacing the script path with your own script :
```
{
"name": "app.cybersource.modifyrequest",
"script": "./cartridge/scripts/hooks/modifyRequestExample"
}
```
You can copy the ‘scripts/hooks/modifyRequestExample’ script from this cartridge into your own to use as a template for extending and modifying service request objects.  Note, every hook must return a valid request object for the given service.  It is recommended that you reference the CybserSource documentation for details on the exact nature of any fields you wish to customize or add.

Step 2: The following hooks are available for you to define in this file:
Modify Request hooks
Hook Name | Service Request to modify
------------ | -------------
CCAuth | Credit Card Authorization
PayerAuthEnroll | Payer Authentication Enrollment
PayerAuthValidation | Payer Authentication Validation
AuthReversal | Credit Card Authorization Reversal
Capture | Credit Card Capture
Credit | Credit Card Credit/Refund
Tax | Tax Calculation

### **12. Failover/Recovery Process**

Visa has dedicated data centers in Virginia and Colorado. There are no single points of failure. Visa Data Centers implement redundant, dual-powered equipment, multiple data and power feeds, and fault tolerance at all levels with 99.995% uptime. In case of any failover, please open support case @ https://support.cybersource.com

Disable Cartridge
Step 1: In the Business Manageer, go to **Merchant Tools > Custom Preferences > Cybersource Core** and set values for the following parameters:

Field | Description | Value to Set
------------ | ------------- | -----------
Enable Cybersource Cartridge | Enable or disable Cyberdource Cartridge. If disabled none of the Cybersource services are invoked | **No**

Step 2: In the Business Manager, go to **Merchant Tools > Ordering > Payment Methods** and select **CREDIT_CARD**. And in **CREDIT_CARD details**, change processor **Payment Processor** = **"BASIC_CREDIT"** 

### **13. Supported Locales**

Out of box cartridge supports most of the locales like English (United States), English (United Kingdom), French (FRANCE), English (Austria), German (GERMANY), Dutch (NETHERLANDS) and more. 