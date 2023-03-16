## <ins>Release History

**Version 22.1.3 (December 30, 2022)**
•	We have upgraded the cartridge to support SFRA v6.2.
•	We have mapped requestID to transactionID in Klarna payment method.
•	We have added PayPal Pay Later message in the PayPal widget. 

**Version 22.1.2 (September 02, 2022)**
•	We have updated the file name songbird.isml to songBird.isml
•	We have updated the cartridge to make it compatible with Salesforce B2C Commerce release 22.7.
•	We have fixed the issue where payment details were updated with undefined.

**Version 22.1.1 (July 14, 2022)**
•	We fixed an issue in PayPal where non-english characters was not returned in the Cybersource response.
•	We added bin detection in 3ds flow.  

**Version 22.1.0 (May 15, 2022)**
•	We have added paymentFlowMode configuration for Klarna payment.
•	We have added support for SCA changes for Irish processor.
•	We have updated the payment method Id for PayPal Credit to support PayPal payment for Salesforce Order Management.  
•	We have added Transaction Type and Transaction Id for PayPal payment to support PayPal payment for Salesforce Order Management.
•	We have fixed a Decision Manager issue for Visa Click to Pay. 
•	We have fixed a Decision Manager issue for Credit card transactions. 
•	We have upgraded the Cybersource WSDL version to 1.192.


**Version 21.3.0 (Nov 30, 2021)**
•	We have disable Giropay and EPS Bank transfer method. 
•	We have implemented Decision Manager service for Bank Transfer. 
•	We have implemented Decision Manager service for Visa Click to Pay. 
•	We have implemented Decision Manager service for PayPal. 
•	We have added missing isSubscription custom field in metadata file. (GitHub issue#10)
•	We have fixed GitHub issue #71
•	We have fixed GitHub issue #69
•	We have fixed GitHub issue #75
•	We have implemented a new flag to override shipping address of PayPal. 


**Version 21.2.0 (Aug 27, 2021)**
•	We have updated credit card form page in the My Account page with Flex Microform v0.11 implementation. 
•	We have updated the cartridge to make it compatible with Salesforce B2C Commerce release 21.2.
•	We have implemented Decision manager in Payer Authentication call. 
•	We have implemented standalone Decision manager service so merchants can call this service on demand.
•	We have implemented standalone service for Capture, Credit, Auth reversal for Klarna. 
•	We improved the quality of the code by linting.


**Version 21.1.0 (Feb 15, 2021)**
•	Provide an option to enable/disable cartridge via business manager configuration.
•	Upgrade the cartridge to support SFRA v5.1.0
•	We improved the metadata import process, now merchants can easily import all the metadata in a single go without having to import individual files.
•	We improved the grouping of Site Preferences. All the related configurations can be found in the appropriate grouping. 
•	Storefront’s order confirmation email will now be sent to the storefront's registered email rather than to PayPal’s registered email.
•	We made Payer authentication's site preference optional if you are not using PA. (GitHub issue#44)
•	We improved the quality of the code by linting.
•	We removed hard coding of environment variable for Google Pay. (GitHub issue#53)
•	We removed hard coding of host URL from Decision manager job. (GitHub issue#49)
•	We fixed the javascript method in songbird.isml. (GitHub issue#47)
•	We removed server.replace from the cartridge. (GitHub issue#45)
•	We improved the documentation of the cartridge. 
•	Replaced the deprecated webreference package with webreference2 package.

**Version 19.5.3 (Dec 30, 2020)**
•	Support 3ds for French Processor
•	Remove flash code from Device fingerprint

**Version 19.5.2 (Dec 04, 2020)**
•	Fix order token issue for SA_Redirect. (GitHub issue#57)
•	Fix skip_decision_manager flag issue for SA_Silent Order Post (GitHub issue#46)

**Version 19.5.1 (Nov 11, 2020)**
•	Improved security on accessing and modifying sensitive fulfillment-related actions on an order (e.g., order acceptance, canceling etc.).
•	Add billing address to pa_enroll and pa_validate.
•	Fix 3DS issues

**Version 19.5.0 (May 20, 2020)**
•	Add WeChat Pay payment method.

**Version 19.4.1 (March 17, 2020)**
•	Rate Limiting added to the My Accounts page, so a Merchant can determine the number of cards that can be edited or added.
•	Update CyberSource WSDL to support Apache CXF v3 upgrade.

**Version 19.4.0 (Feb 25, 2020)**
•	Updated cartridge to make it compatible with 4.3.0 version of SFRA.
•	Bug fix on silent Post Payment method.
•	Change reference code from “test” to unique ID in subscription creation and deletion call.
•	Bug fix on JCB and Dinner club card processing.
•	Minor fixes on Tax calculation that uses CyberSource tax services.
•	Improved error handling on SA Flex and SA iframe.
•	Bug fixes on PayPal button logo in Germany locale.
•	Restructured cartridge folder to adhere to Salesforce’s new standards.

**Version 19.3.4 (Nov 14, 2019)**
•	Supports Klarna payment and replace Conversion Detail Report to REST API

**Version 19.3.2 (Sept 13, 2019)**
•	Bug fix on basic credit transactions to work as when Cardinal Cruise/Payer Auth is not configured

**Version 19.3.1 (Sept 10, 2019)**
•	3DS Documentation update

**Version 19.3.0 (July 26, 2019)**
•	Update 3DS to version 2.0 utilizing Cardinal Cruise.

**Version 19.1.1 (June 06, 2019)**
•	PayPal will now utilize the ‘CyberSource Endpoint’ site preference.
•	Update to accommodate hitting the back button during SA redirect checkout.
•	Added details to documentation.

**Version 19.1.0 (Feb 08, 2019)**
•	Adds PayPal and PayPal Express Integrations
•	Security patch to Test suite in Controllers Cartridge.
•	Update to SA Flex date generation to require an en_US local.
•	Fix to SA Flex payment response data being saved properly.

**Version 18.1.2 (Jan 09, 2019)**
•	Update documentation with SFRA compatibility note.
•	Remove public facing endpoints that can finalize an Order.
•	Fix to SA SilentPost not processing Orders with Fraud status of 'Review'
•	Ensure all Orders with Fraud decisions of 'Review' are placed in a 'Not Confirmed' state.
•	Utilize CS endpoint preference to set Test or Production url endpoints.
•	Always Send Date to Flex Token API in US English format.

**Version 18.1.1 (Nov 06, 2018)**
•	Adds hooks to customize request objects.
•	Separates subscription creation option to use a new site preference.
•	Adds Facade for ‘Credit Card Credit’ Service.
•	Adds Facade for ‘Credit Card Capture Service.
•	Adds Facade for ‘Credit Card Auth Reversal’ Service.

**Version 18.1.0 (Oct 25, 2018)**
•	Initial SFRA release.



