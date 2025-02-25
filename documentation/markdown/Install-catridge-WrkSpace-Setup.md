## <ins>Install the Cartridge and Setup Workspace

### Step 1: Install the Cartridge
Cybersource's Storefront Reference Architecture Cartridge can be installed from Salesforce Commerce Cloud's marketplace [link](https://appexchange.salesforce.com/listingDetail?listingId=a0N3u00000RZaiQEAT&tab=e)

### Step 2: Workspace Preparation
1. Create a folder “CyberSource” in your workspace and place the cartridge (int_cybersource_sfra)downloaded from Marketplace. 
2. If you have a different project set-up, you will need to open the file ‘/package.json’ and modify the paths.base value to point to your ‘app_storefront_base’ cartridge. This path is used by the JS and SCSS build scripts. 

![](Images/Workspace_Preparation.png)

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

### Step 3: Create a p12 file for authentication
 Create a p12 file that you can use to authenticate requests. 
 Place the file generated in the webreferences2 folder in the same cartridge as the WSDL file and the file extension must be that of the type jks or pkcs12. Duplicate the CyberSourceTransaction.wsdl file, CyberSourceTransaction.wsdl.properties file and rename them with the same name as your respective p12 files.  
Repeat  the above step to use multiple p12 files as per requirements. 

**NOTE**: If you are using different IDE, refer respective developer guide to setup the workspace. 

### Step 4: Build and Upload the code
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
