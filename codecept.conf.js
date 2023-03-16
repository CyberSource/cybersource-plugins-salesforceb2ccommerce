var RELATIVE_PATH = './test/acceptance';
var OUTPUT_PATH = RELATIVE_PATH + '/report';
var HOST = 'https://cybersource08-tech-prtnr-na07-dw.demandware.net/';

var webDriver = {
    url: HOST,
    browser: 'chrome',
    smartWait: 10000,
    waitForTimeout: 10000,
    timeouts: {
        script: 60000,
        'page load': 10000
    }
};

exports.config = {
    output: OUTPUT_PATH,
    helpers: {
        WebDriver: webDriver
    },
    plugins: {
        wdio: {
            enabled: true,
            services: ['selenium-standalone']
        },
        allure: {
            enabled: true
        },
        retryFailedStep: {
            enabled: true,
            retries: 5
        }
    },
    include: {
        homePage: RELATIVE_PATH + '/pages/HomePage.js',
        productPage: RELATIVE_PATH + '/pages/ProductPage.js',
        cartPage: RELATIVE_PATH + '/pages/CartPage.js',
        uriUtils: RELATIVE_PATH + '/utils/uriUtils.js'
    },
    gherkin: {
        features: RELATIVE_PATH + '/features/**/*.feature',
        steps: [
            RELATIVE_PATH + '/features/steps/land_home_page.steps.js',
            RELATIVE_PATH + '/features/steps/add_product_to_cart.steps.js',
            RELATIVE_PATH + '/features/steps/simple_product_details.steps.js'
        ]
    },
    tests: RELATIVE_PATH + '/tests/**/*.test.js',
    name: 'storefront-reference-architecture'
};
