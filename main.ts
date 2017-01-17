declare function require(name:string);
declare var process;
declare var JSON;
declare var Math;

require('chromedriver');
import * as webdriver from 'selenium-webdriver';
var By = webdriver.By;
var until = webdriver.until;
var uuid = require('uuid/v1');
import * as moment from 'moment';
import * as readline from 'readline';
import * as fs from 'fs';

var MAX_WAIT = 30000;
var config = JSON.parse(fs.readFileSync(process.argv[2]).toString());

function login(driver: webdriver.WebDriver, options) {
    //Login
    driver.get('http://jenkins.ilrn-support.com/jenkins/job/TestPages/ws/CNOWLogin/index.html');
    driver.findElement(By.css('#customUserName')).sendKeys(options.username);
    driver.findElement(By.css('#customPassword')).sendKeys(options.password);
    driver.findElement(By.css('#updateEntitlements')).click();
    var productEl = driver.findElement(By.css('#product'));
    driver.wait(function() {
        return productEl.getAttribute('value');
    }, MAX_WAIT);
    driver.findElement(By.css('#loginBtn')).click();

    //Switch to logged in window/tab
    driver.getAllWindowHandles().then(function(handles: any) {
        driver.switchTo().window(handles[handles.length - 1]);
    });
    driver.wait(until.elementLocated(By.css('#CREATEASSIGNMENT_OVERVIEW_LINK')), MAX_WAIT);
}

function ltiLogin(driver: webdriver.WebDriver, options) {
    //Login
    driver.get('http://jenkins.ilrn-support.com/jenkins/job/TestPages/ws/LTI/login.html');
    driver.findElement(By.css('#customUserName')).sendKeys(options.username);
    driver.findElement(By.css('#customPassword')).sendKeys(options.password);
    driver.findElement(By.css('#courseId')).sendKeys(options.courseKey);

    if (options.assignmentUuid) {
        driver.findElement(By.css('#activityId')).sendKeys(options.assignmentUuid);
    }

    driver.findElement(By.css('#go')).click();
    
    driver.wait(function() {
        return new webdriver.promise.Promise(function(resolve, reject) {
            driver.getAllWindowHandles().then(function(handles: any) {
                resolve(handles.length > 1);
            });
        });
    }, MAX_WAIT);

    //Switch to logged in window/tab
    driver.getAllWindowHandles().then(function(handles: any) {
        driver.switchTo().window(handles[handles.length - 1]);
    });

    if (!options.assignmentUuid) {
        driver.wait(until.elementLocated(By.css('#CREATEASSIGNMENT_OVERVIEW_LINK')), MAX_WAIT);
    }
}

function navigateToAssignments(driver: webdriver.WebDriver) {
    driver.findElement(By.css('#CREATEASSIGNMENT_OVERVIEW_LINK')).click();
    driver.wait(until.elementLocated(By.css('.createAssignmentBtn')), MAX_WAIT);
}

function createTimedTest(driver: webdriver.WebDriver, options) {
    driver.findElement(By.css('.createAssignmentBtn')).click();
    
    //Choose Type
    driver.wait(until.elementLocated(By.css('input[value="NON_MASTERY_CHEMISTRY_TEST"]')), MAX_WAIT);
    driver.findElement(By.css('input[value="NON_MASTERY_CHEMISTRY_TEST"]')).click();
    driver.findElement(By.css('#createCourseNextStepButton')).click();

    //Test Information
    driver.findElement(By.css('#assignmentName')).sendKeys(options.name);
    driver.findElement(By.css('#availableDateFormat')).sendKeys(formatDateInput(options.available));
    driver.findElement(By.css('#assignmentName')).click(); //Close date-picker.
    driver.sleep(1500);
    driver.findElement(By.css('#allowPracticeModeAfterTake')).click(); //Uncheck the practice option.
    driver.findElement(By.css('#assignmentInfoNextStepButton')).click();

    //Available Questions
    driver.wait(until.elementLocated(By.css('#section_zumfulltb09t .expandButton')), MAX_WAIT);
    driver.wait(until.elementIsVisible(driver.findElement(By.css('#section_zumfulltb09t .expandButton'))), MAX_WAIT);
    driver.findElement(By.css('#section_zumfulltb09t .expandButton')).click();
    driver.findElement(By.css('#section_zumfulltb09t_16611739 .filterChildrenButton')).click();
    driver.findElement(By.css('#contentTreeContinueButton')).click();

    //Included Questions
    driver.wait(until.elementsLocated(By.css('.availableItems .itemList > li')), MAX_WAIT);
    driver.sleep(5000);
    driver.findElement(By.css('.includeAllItems')).click();
    driver.sleep(3000);
    driver.findElement(By.css('#continueButton')).click();

    //AssignmentOptions
    driver.wait(until.elementLocated(By.css('#timeAllowedCombo_1')), MAX_WAIT);
    driver.wait(until.elementIsVisible(driver.findElement(By.css('#timeAllowedCombo_1'))), MAX_WAIT);
    driver.findElement(By.css('#timeAllowedCombo_1')).click();
    var timeAllowed = driver.findElement(By.css('input[name="timeAllowed"]'));
    timeAllowed.clear();
    timeAllowed.sendKeys('30');
    var continueButton = driver.findElement(By.css('.continueButton.navButton.button.primary'));
    scrollIntoView(driver, continueButton);
    continueButton.click();
}

function formatDateInput(date: moment.Moment) {
    date.set('minute', Math.floor(date.get('minute') / 5) * 5);
    return date.format('MMM D, YYYY hh:mm A');
}

function rng(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function scrollIntoView(driver: webdriver.WebDriver, element: webdriver.WebElement) {
    driver.executeScript('arguments[0].scrollIntoView(true);', element);
    driver.sleep(2000);
}

function innerHtml(driver: webdriver.WebDriver, element: webdriver.WebElement) {
    return new webdriver.promise.Promise(function(resolve, reject) {
            driver.executeScript(function() {
            return arguments[0].innerHTML;
        }, element).then(function(html) {
            resolve(html);
        });
    });
}

function closeAllWindows(driver: webdriver.WebDriver) {
    driver.getAllWindowHandles().then(function(handles: any) {
        handles.forEach(function(handle: string) {
            driver.switchTo().window(handle);
            driver.close();
        });
    });
}

//Tests
function ilrn72245(config: any) {
    var COURSE_KEY = config.ilrn72245.course;
    //Instructor Creates Test
    var driver = new webdriver.Builder().forBrowser('chrome').build();
    driver.manage().window().maximize();
    ltiLogin(driver, {
        username: config.ilrn72245.users.instructor.username,
        password: config.ilrn72245.users.instructor.password,
        courseKey: COURSE_KEY
    });
    navigateToAssignments(driver);
    var testName = uuid();
    createTimedTest(driver, {
        name: testName,
        available: moment()
    });
    driver.sleep(5000);
    innerHtml(driver, driver.findElement(By.css('#ltiAuxUUID'))).then(function(ltiAuxUUID) {
        closeAllWindows(driver);

        //Student Takes Test
        driver = new webdriver.Builder().forBrowser('chrome').build();
        driver.manage().window().maximize();
        ltiLogin(driver, {
            username: config.ilrn72245.users.student.username,
            password: config.ilrn72245.users.student.password,
            courseKey: COURSE_KEY,
            assignmentUuid: ltiAuxUUID
        });

        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Done?', function(answer) {
            driver.quit();
            rl.close();
        });
    });
}

//Test-Suite
ilrn72245(config);