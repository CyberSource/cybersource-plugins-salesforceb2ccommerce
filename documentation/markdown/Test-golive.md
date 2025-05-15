## <ins>Test and Go Live

Test your integration, and configure your live account, so you can start processing live transactions.

#### Test your integration

Before you start accepting payments, test your integration in Test sandbox: 

   > The sandbox simulates the live payment gateway. The sandbox never processes an actual   payment. We do not submit sandbox transactions to financial institutions for processing.
   The sandbox environment is completely separate from the live production environment, and it requires separate credentials.  If you use your production credentials in the sandbox or visa versa, you get a 401 HTTP error.  

Sign up for a [sandbox account](https://developer.cybersource.com/hello-world/sandbox.html) if you have not yet.

Use our test card numbers to make test payments:
  > The following test credit card numbers (https://developer.cybersource.com/hello-world/testing-guide-v1.html) work only in the sandbox. If no expiration date is provided, use any expiration date after today’s date. If the card verification code is required and is not provided, use any 3-digit combination for Visa, Mastercard, Discover, Diners Club and JCB; use a 4-digit combination for American Express.

Register SFCC sandbox to Apple Sandbox Account.
 
   1. Go to: **“Merchant Tools > Site Preferences > Apple pay**
   2. Under **Domain Registration** section 
      a. Click on **Register Apple Sandbox** under Apple Sandbox section for registering SFCC to Apple Sandbox account.

To manage your evaluation account, log in to the [Test Business Center](https://ebctest.cybersource.com/) and do the following:
- View test transactions.
- Access administrator users and access privileges.
- Create roles with predefined access permissions.
- View reports.

> **Important**
 Cybersource recommends that you submit all banking information and required integration services in advance of going live. Doing so will speed up your merchant account configuration.

#### Configure your live account

Once you have the credentials for the live environment:

1. <a href="Configure-cartridge.md">Configure cartridge</a> using your live account settings.
 
2. Test your integration.



---