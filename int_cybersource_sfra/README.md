# Cybersource Link Cartridge

This is a repository for the Cybersource SFCC Storefront Reference Architecture reference application integration cartridge.

THe Cybersource cartridge has a link cartridge (`LINK_cybersource`) provided by Cybersource that is never directly customized or edited. Instead, customization cartridges are layered on top of the base cartridge and this link cartridge. This change is intended to allow for easier adoption of new features and bug fixes.

# Getting Started

1 Set node version to 8.11.3

2 Clone this repository.

3 Run `npm install` to install all of the local dependencies (node version 8.x or current LTS release recommended)

4 Run `npm run compile:js` from the command line that would compile all client-side JS files. Run `npm run compile:scss` and `npm run compile:fonts` that would do the same for css and fonts.

5 Create `dw.json` file in the root of the project:
```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```

6 Run `npm run uploadCartridge` command that would upload `LINK_cybersource` cartridge to the sandbox you specified in dw.json file.

7 Add the `LINK_cybersource` cartridge to your cartridge path.

8 You should now be ready to navigate to and use your site.


# NPM scripts
Use the provided NPM scripts to compile and upload changes to your Sandbox.

## Compiling your application

* `npm run compile:scss` - Compiles all .scss files into CSS.
* `npm run compile:js` - Compiles all .js files and aggregates them.

## Linting your code

`npm run lint` - Execute linting for all JavaScript and SCSS files in the project. You should run this command before committing your code.

## Watching for changes and uploading

`npm run watch` - Watches everything and recompiles (if necessary) and uploads to the sandbox. Requires a valid dw.json file at the root that is configured for the sandbox to upload.

## Uploading

`npm run uploadCartridge` - Will upload both `app_storefront_base` and `modules` to the server. Requires a valid dw.json file at the root that is configured for the sandbox to upload.

`npm run upload <filepath>` - Will upload a given file to the server. Requires a valid dw.json file.

#Testing
## Running unit tests

You can run `npm test` to execute all unit tests in the project. Run `npm run cover` to get coverage information. Coverage will be available in `coverage` folder under root directory.

* UNIT test code coverage:
1. Open a terminal and navigate to the root directory of the mfsg repository.
2. Enter the command: `npm run cover`.
3. Examine the report that is generated. For example: `Writing coverage reports at [/Users/yourusername/SCC/sfra/coverage]`
3. Navigate to this directory on your local machine, open up the index.html file. This file contains a detailed report.
