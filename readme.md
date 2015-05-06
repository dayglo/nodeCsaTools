#nodeCsaTools

This repo is a work-in-progress set of tools for automation of the HP system 'Cloud Service Automation'.

HP CSA is an enterprise app that exposes an api which is meant for companies to build their own 'marketplace' portal. These portals are for developers and delivery teams to request infrastructure resources, a bit like an in-house AWS (but not as good). This api has turned out to be a useful method by which we can run end-to-end automated tests of our customer-facing services.

The csautils module in the repo allows developers to instantiate 'promise returning functions', which can be chained and recombined to request and destroy CSA services. The aim of this project is to allow devs to create tests which look synchronous, but all the while retaining their asynchronous nature. Promises are cool.

##Demo

Here's a <a href-="https://www.youtube.com/watch?v=CEIoDPwDBIo">thoroughly exciting video</a> of some of the tools.

##Install
NOt an npm module yet, sorry.

Just clone, run npm install for dependencies and then run the commands detailed below. Currently the tools include:

###Login
See the other tools for an example of how to log in.

###Bulk Subscriber
####Usage
```
node bulksub.js <offering id> <catalog id>  <category name> <number of runs> <requests per run> '<unique prefix for subscriptions>'
node bulksub.js 2c9030074c745ae6014c74c0ba370b76 2c9030e44b77dd62014b7de363b82048  SOFTWARE 2 2 'mayfifth2'
```

###Modify Subscription
####Usage
```
node modifySub.js <subscriptionId> <catalogId>
node modifySub.js 2c9030e44d2307ee014d28fbbbb22cd1 2c9030e44b77dd62014b7de363b82048
```

[note: modify does the modification, but cannot yet look up the subscription ID, so reports a partial failure]

###Delete subscriptions
####Usage
```
node delSubs.js '<partial subscription name>'
node delSubs.js 'Project X Oracle servers'
````
