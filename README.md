# How to run this app:

#### Run `yarn install` or delete the `yarn.lock` file and run `npm install` to install the necessary dependencies.

### There are 3 endpoints:

**All 3 endpoints take one parameter `url`**

* `/video` Checks if a video exists in the url.

* `/analytics` Checks if the website uses google analytics.

* `/audit` Runs audit tests on the website and returns SEO results and others.

**Example:** `http://localhost:5000/video?url=https://www.youtube.com` 

**Please Note:** This app doesn't have a UI, so you have to run the APIs using Postman or other API tools.

