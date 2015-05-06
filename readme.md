#nodeCsaTools

This repo holds a set of scripts for automation of the HP tool 'Cloud Service Automation'.

HP CSA is an enterprise app that exposes an api which is meant for companies to build their own 'marketplace' portal. These portals are menat for developers to request infrastructure resources, a bit like an in-house AWS (but not as good). This api has turned out to be a useful method by which we can run end-to-end automated tests of our customer-facing services.

The csautils module in the repo allows developers to instantiate 'promise returning functions', which can be chained and recombined to request and destroy CSA services. The aim of this project is to allow devs to create tests which look synchronous, but all the while retaining their asynchronous nature. Promises are cool.


Currently the tools include:

##Login
See the other tools for an example of how to log in.

##Bulk Subscriber
###Usage
```
bulksub.js <offering id> <catalog id>  <category name> <number of runs> <requests per run> '<unique prefix for subscriptions>'
bulksub.js 2c9030074c745ae6014c74c0ba370b76 2c9030e44b77dd62014b7de363b82048  SOFTWARE 2 2 'mayfifth2'
```

##Modify Subscription


##Delete subscriptions