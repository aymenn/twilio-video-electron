# Twilio Video Electron + Screensharing Demo

This example demonstrates how you can embed Twilio Video in Electron and enable screen sharing.

It is based on [Twilio Video Quickstarty](https://github.com/twilio/video-quickstart-js), [Electron Quick Start Guide](https://electronjs.org/docs/tutorial/quick-start) and [Electron's desktopCapturer](https://electronjs.org/docs/api/desktop-capturer)

## Setting Up The Application

Create a configuration file for your application:
```bash
cp .env.template .env
```

Edit `.env` with the configuration parameters:

* Account SID: Your primary Twilio account identifier - find this [in the console here](https://www.twilio.com/console).
* API Key: Used to authenticate - [generate one here](https://www.twilio.com/console/runtime/api-keys).
* API Secret: Used to authenticate - [just like the above, you'll get one here](https://www.twilio.com/console/runtime/api-keys).


Next, we need to install our dependencies from npm:
```bash
npm install
```

Now we should be all set! Run the application:
```bash
npm start
```

Electron and a web version will be availablet at http://localhost:3000 will start 