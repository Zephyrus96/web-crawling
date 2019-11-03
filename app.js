const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');

const app = express();

//Parse incoming requests to json.
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//check if the url is prefexed by https, if not, add it.
const checkURL = (url) => {
    if(!url.match(/^[a-zA-Z]+:\/\//)){
        url = "https://" + url;
    }
    
    return url;
}


//Endpoint for checking if a video exists in the page
app.get('/video', async (req,res) => {
    //Start browser
    const browser = await puppeteer.launch();
    
    //Get the url and visit the page using puppeteer.
    const url = checkURL(req.query.url);

    const page = await browser.newPage();
    try{
        await page.goto(url,{waitUntil: 'domcontentloaded'});
    } catch(e){
        console.log(e);
        res.send({message: "Please enter a valid url."});
    }
    
    //Check if a video exists in the page.
    let videoExists;
    
    try{
        let videoTagExists,iframeTagExists

        //Check if video tag exists.
        try {
            videoTagExists = await page.waitForSelector('video' , {timeout: 15000}) !== null;
        } catch(e) {
            videoTagExists = false;
        }

        //Check if iframe tag exists.
        try {
            iframeTagExists = await page.waitForSelector('iframe[allowfullscreen]' , {timeout: 15000}) !== null;
        } catch(e) {
            iframeTagExists = false;
        }

        finally {
            videoTagExists || iframeTagExists ? videoExists = true : videoExists = false;
        }

    } catch(e){
        console.log(e);
    }

    //Send back data to the client.
    res.send({
        videoExists
    });

    await page.close();
    await browser.close();
});


//Endpoint to check if the website uses google analytics.
app.get('/analytics', async (req,res) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const result = [];

    const url = checkURL(req.query.url);

    //For intercepting requests sent to google analytics.
    page.setRequestInterception(true);

    //Run check on url.
    page.on('request' , request => {
        const url = request.url();

        //Match the url used to send data to google analytics.
    
        if (url.match(/^https?:\/\/www\.google-analytics\.com\/(r\/)?collect/i))
            res.send({analytics: true})
        
        !result.length ? request.continue() : request.abort();
        console.log(result.length);
    });

    //Visit the url and listen for requests.
    try {
        await page.goto(url);
        await page.waitFor(15000);
    } catch(e){
        res.send({
            message: "Please enter a valid url"
        });
        console.log(e);
    }

    res.send({
        analytics: false,
    });
    
    await page.close();
    await browser.close();
});



//Endpoint to audit the website.
app.get('/audit', async (req,res) => {
    const options = {
        chromeFlags: [
            "--headless"
        ]
    };

    const config = {
        extends: 'lighthouse:default',
        settings: {
            onlyAudits: [
            'first-meaningful-paint',
            'speed-index',
            'first-cpu-idle',
            'interactive',
            ],
            onlyCategories: [
                'performance',
                'seo',
                'accessibility',
                'pwa',
                'best-practices'
            ]
        },
    };

    let audits = [];

    const fillAudits = (value) => {
        let obj = {
            title: value.title,
        };

        if(value.description)
            obj.description = value.description;
        
        if(value.score)
            obj.score = value.score;

        if(value.displayValue)
            obj.displayValue = value.displayValue;

        audits = [...audits, obj];
    }

    const chrome = await chromeLauncher.launch({chromeFlags: options.chromeFlags});
    options.port = chrome.port;
    
    let result;

    //Check if the URL is valid.
    const url = checkURL(req.query.url);

    try{
        result = await lighthouse(url, options, config);
    } catch (e){
        res.send({message: "Please enter a valid URL."});
    }

    const lhr = result.lhr;
    
    await chrome.kill();
    
    //Fill the array with the required data to send.
    fillAudits(lhr.audits["first-meaningful-paint"]);
    fillAudits(lhr.audits["speed-index"]);
    fillAudits(lhr.audits["first-cpu-idle"]);
    fillAudits(lhr.audits["interactive"]);
    fillAudits(lhr.categories["performance"]);
    fillAudits(lhr.categories["seo"]);
    fillAudits(lhr.categories["accessibility"]);
    fillAudits(lhr.categories["best-practices"]);
    fillAudits(lhr.categories["pwa"]);

    //Send the data to the client.
    res.send(audits);

});


app.listen('5000', () => console.log("Server running on port 5000"));

