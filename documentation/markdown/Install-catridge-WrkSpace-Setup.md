## <ins>Install the Cartridge and Setup Workspace

### Step 1: Install the Cartridge
Cybersource's Storefront Reference Architecture Cartridge can be installed from Salesforce Commerce Cloud's marketplace [link](https://www.salesforce.com/products/commerce-cloud/partner-marketplace/partners/cybersource/)

### Step 2: Workspace Preparation
1. Create a folder “CyberSource” in your workspace and place the cartridge (int_cybersource_sfra)downloaded from Marketplace. 
2. If you have a different project set-up, you will need to open the file ‘/package.json’ and modify the paths.base value to point to your ‘app_storefront_base’ cartridge. This path is used by the JS and SCSS build scripts. 

![](CyberSource/documentation/markdown/Images/Workspace_Preparation.png)

3. If using VSCode, install the extension Prophet Debugger [link]((https://marketplace.visualstudio.com/items?itemName=SqrTT.prophet)) or any other SFCC extension and include below in dw.json (). 
``` JSON
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "version": "version_to_upload_to",
    "cartridge": [
                "int_cybersource_sfra",
                "app_storefront_base",
                "modules"
 ]
}
```
**NOTE**: If you are using different IDE, refer respective developer guide to setup the workspace. 

### Step 2: Build and Upload the code
Prerequisite: install node under "Cybersource" folder.
#### Install sgmf-scripts and copy-webpack-plugin
Install sgmf-scripts with following command 

    npm install sgmf-scripts && npm install copy-webpack-plugin

#### Compile the Code
Compile JS and SCSS with following command

    npm run compile:js && npm run compile:scss

#### Upload the code
Upload the code to Salesforce Commerce Cloud instance

    npm run uploadCartridge


<div style="text-align: right;font-size: 20px" ><a href="Configure-payment-method.md">Next Step: Configure the Payment Method</a></div> 



---
