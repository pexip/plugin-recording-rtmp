# Web App 3 Plugin: Recording RTMP

Plugin that can be used to record a conference. Internally, it sends the video through RTMP to a server that support this kind of streams. It can use RTMP or RTMPS, but it's strongly recommended to use RTMPS.

It can be configured in two modes:

- **Dynamic RTMP URI:** Each time the user starts a recording, they will be asked to enter the RTMP URI. It's flexible, but the user has to know the URI and write it each time.
- **Static RTMP URI:** The URI is defined in a configuration file and can only be changed by a Pexip Infinity Administrator. When the user click on the plugin button, the recording will start automatically without the need of entering any additional data.

## Configure plugin

We have a configuration file to choose between the two modes that we commented before. The configuration file could be found in the next paths:

- `./public/config.json`: Path if you download the **source code** and run it in developer mode.
- `./recording-rtmp/config.json`: Path in case you download the **precompiled package**.

If you want to run the plugin with **dynamic RTMP URI** you should remove the `recordingUri` parameter from the configuration file:

```json
{
  "recordingUri": ""
}
```

In case we want to define an **Static RTMP URI**, you only only have to define it in the file:

```json
{
  "recordingUri": "rtmps://example-rtmp.pexip.com/my-recordings"
}
```

## Run for development

- Install all the dependencies:

```bash
$ npm i
```

- Run the dev environment:

```bash
$ npm start
```

The plugin will be served from https://localhost:5173, but you should access it thought the Web App 3 URL. You have more information about how to configure your environment in the [Developer Portal: Setup guide for plugin developers](https://developer.pexip.com/docs/plugins/webapp-3/setup-guide-for-plugin-developers).

## Build for production

To create a package you need to install first all the dependencies:

```bash
$ npm i
```

And now to create the package itself:

```bash
$ npm run build
```

Congrats! Your package is ready and it will be available in the `dist` folder. The next step is to create a Web App3 branding and copy `dist` into that branding.

If you want to know more about how to deploy your plugin in Pexip Infinity, check our [Developer Portal](https://developer.pexip.com).