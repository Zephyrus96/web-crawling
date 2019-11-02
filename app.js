const express = require('express');
const axios = require('axios');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();

//Parse incoming requests to json.
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

(async () => {
    //Start browser
    const browser = await puppeteer.launch({headless: true});

    //Endpoint for checking if a video exists in the page
    app.get('/video', async (req,res) => {
        //Get the url and visit the page using puppeteer.
        const url = req.query.url;
    
        const page = await browser.newPage();
        await page.goto(url,{waitUntil: 'domcontentloaded'});
        
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

        console.log(videoExists);

        await page.close();
    });

    app.get('/analytics', async (req,res) => {
        const page = await browser.newPage();
        const result = [];

        page.setRequestInterception(true);

        //Run check on url.
        page.on('request' , request => {
            const url = request.url();

            // const regexp = /(UA|YT|MO)-\d+-\d+/i;

            //Match the url used to send data to google analytics.
       
            if (url.match(/^https?:\/\/www\.google-analytics\.com\/(r\/)?collect/i)) {
                result.push(url);
            }
            !result.length ? request.continue() : request.abort();
            console.log(result.length);
        });

        //Visit the url and listen for requests.
        try {
            await page.goto(req.query.url);
            await page.close();
    
        } catch (err) {
            console.log("Couldn't fetch page " + err);
        }
        
        console.log(result);
  
    });

    app.listen('5000', () => console.log("Server running on port 5000"));
})();

