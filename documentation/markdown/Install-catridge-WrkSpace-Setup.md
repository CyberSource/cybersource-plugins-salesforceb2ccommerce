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

### 3. Authentication and Encryption

Merchants can generate either a p12 key or a meta key to authenticate requests.

#### 3.1. Create a p12 key

We can use p12 key generated for a specific MID from which it is created. Follow the steps mentioned in [link] (https://developer.cybersource.com/docs/cybs/en-us/security-keys/user/all/ada/security-keys/keys-manage/keys-simple-order-intro.html) that you can use to authenticate requests. Convert the P12 file to JKS type by following `Cybersource B2C Commerce - SOAP Authentication Guide.pdf` under cartridge documentation folder. 

Place the file generated in `webreferences2` folder of the same cartridge as the WSDL file and the file extension must be `jks` or `pkcs12`. Duplicate the `CyberSourceTransaction.wsdl` file, `CyberSourceTransaction.wsdl.properties` file and rename them with the same name as your respective keystore files.

#### 3.2. Create Meta Key

We can assign a single meta key to dozens or hundreds of transacting MIDs simultaneously. Follow the steps mentioned in [link] (https://developer.cybersource.com/docs/cybs/en-us/security-keys/user/all/ada/security-keys/keys-meta-intro.html) that you can use to authenticate requests. Convert the P12 file to JKS type by following `Cybersource B2C Commerce - SOAP Authentication Guide.pdf` under cartridge documentation folder. 

Place the file generated in `webreferences2` folder of the same cartridge as the WSDL file and the file extension must be `jks` or `pkcs12`. Duplicate the `CyberSourceTransaction.wsdl` file, `CyberSourceTransaction.wsdl.properties` file and rename them with the same name as your respective keystore files.

Repeat the above step to use multiple p12 files as per requirements.

#### Message-Level Encryption (MLE)

**Message-Level Encryption (MLE)** enables you to store information or communicate with other parties while helping to prevent uninvolved parties from understanding the stored information. MLE is optional and supported only for payments services.

If you choose to use MLE, it is mandatory to use **JKS** as the Keystore type. If you are using MLE, the JKS keystore can be used for Authentication and MLE.

**NOTE**: If you are using different IDE, refer to the respective developer guide to setup


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
