#hpcsa.js

hpcsa is a nodejs library for automating Hewlett Packard's Cloud Service Automation product. You can use it to build testing tools and alternative front end interfaces to your cloud services.

This library uses promises. When you invoke any of the provided methods, a promise will be returned. If you're new to promises, read [this](http://www.html5rocks.com/en/tutorials/es6/promises/) and then come back.


##Install
run
```
> npm install hpcsa
```
and require the module:
```js
var hpcsa = require ('hpcsa');
```

##Usage
First you need to log in to your CSA instance.


```js
var hpcsa = require ('hpcsa');

var login = hpcsa.login("https://myCsaServer:8444", // your HP CSA server 
			"consumer",                 // marketplace username
			"cloud"                     // marketplace password
			"CSA_CONSUMER",             // CSA organisation name
			"idmTransportUser",         // idm username
			"idmTransportUser",         // idm password
			true                        // false to turn off certificate checking
)

login.then(function(xAuthToken){
	console.log ("congratulations. your token is " + xAuthToken)
})
```

Once you've verified this works, you can move onto actually doing stuff. 

###Order a subscription
Here's how to order a basic subscription (add this to the bottom of the above code):

```js

login.then(function(){
	return hpcsa.order(
		"Global Shared Catalog", // catalog name
		"SIMPLE_SYSTEM",         // offering category name
		"RHEL7 Virtual Server",  // offering name
		"My redhat server",      // subscription name
		{},                      // subscriber options
	) 
})
```

I've left the subscriber options empty for the moment; if your service offering has default values for all the options, then you can go ahead and run the above to create a new subscription. 

If you want to specify options, then just provide an object to the order method, like so:

```js
login.then(function(){
	return hpcsa.order(
		"Global Shared Catalog", 
		"SIMPLE_SYSTEM",
		"RHEL7 Virtual Server", 
		"My redhat server", 
		{
			"PROJECTCODE": "P101010"
			"Compute Class": "Gargantuan"
		}
	)  

})
```
In the subscriber options object you can specify either an _option set_ display name.  or a _property_ name. The below screenshot shows both types. In the design shown, __Compute Class__ is an option set, and __PROJECTCODE__ is the real name of the Project Code property.

<img src="http://i.imgur.com/Re7dUS0.png" title="source: imgur.com" />


###Modify a subscription

```js
login.then(function(){
	return hpcsa.modify	(
		"90d9650a36988e5d0136988f03ab000f", // catalog ID
		"SIMPLE_SYSTEM",                    // category name
		"My redhat server",                 // your sub name or ID
		{"Compute Class": "Small"}          // new options
    ) 
})
```

###Run a control action

```js
login.then(function(){
	hpcsa.control (	
		"90d9650a36988e5d0136988f03ab000f", // catalog ID
		"SIMPLE_SYSTEM",                    // category name
		"My redhat server",                 // your sub name or ID
		"Server",                           // component name
		"Reboot Server"                     // control action name
	)
})
```

###Cancel a subscription

```js
login.then(function(){
	return hpcsa.cancel (	
		"90d9650a36988e5d0136988f03ab000f", // catalog ID
		"SIMPLE_SYSTEM",                    // category name
		"My redhat server",                 // your sub name or ID
	)
})
```


##Putting it all together
Using promises allows us to easily chain and recombine asynchronous actions. Here's how you would order a new subscription, immediately modify it, and then finally cancel it:

```js
login
.then(function(){
	return hpcsa.order(
		"Global Shared Catalog",
		"SIMPLE_SYSTEM", 
		"RHEL7 Virtual Server",
		"My redhat server",
		{},
	)
).then(function(){
	return hpcsa.modify	(
		"90d9650a36988e5d0136988f03ab000f",
		"SIMPLE_SYSTEM",
		"My redhat server",
		{"Compute Class": "Small"}
    ) 
).then(function(){
	return hpcsa.cancel (	
		"90d9650a36988e5d0136988f03ab000f",
		"SIMPLE_SYSTEM",
		"My redhat server",
	)
})
```

Here's how you would create three subscriptions simultaneously!

```

var newSubs = [
	[
		"Global Shared Catalog",
		"SIMPLE_SYSTEM", 
		"Windows 2008 R2 SQL server",
		"My SQL server",
		{"COLLATION":"Latin"}
	],
		[
		"Global Shared Catalog",
    	"SIMPLE_SYSTEM", 
    	"RHEL7 Virtual Server",
    	"My app server",
    	{}
    ],
    [
		"Global Shared Catalog",
    	"SIMPLE_SYSTEM", 
    	"RHEL7 Virtual Server",
    	"My web server",
    	{"Install Apache": true}
    ]
]

login.then(function(){
	//convert each array element to a promise
	var promises = newSubs.map(function(sub){
		return hpcsa.order.apply(this, sub)
	})

	// return when they're all done!
	return Promise.all(promises)
})
```



