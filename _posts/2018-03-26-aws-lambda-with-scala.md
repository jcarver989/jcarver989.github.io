---
layout: post
title: aws-lambda4s, the easiest way to build Lambdas with scala
---

Lately, I've been writing a lot of serverless functions using [AWS Lamba](https://aws.amazon.com/lambda/) and [Scala](https://www.scala-lang.org/) (my favorite "workhorse" language these days). Not having to worry about managing server instances has been a huge boon to my productivity, however like most AWS services, Lambda takes a fair amount of boilerplate to setup in a way that's "production ready".

Namely, these are the things I wanted:

* An API that lets me use Scala's case classes and convert them to/from JSON (which Lambda expects)
* Logging, `println` is not "logging"
* An easy way to write Lambdas that use API Gateway via Proxy integration
* Dead simple HTTP route matching for building a REST API

Googling around, I didn't find anything that fit what I wanted, so I ended up writing my own micro library to do all of this and make writing Lambdas in Scala super easy, it's called `aws-lambda4s`. It's [open source on Github](https://github.com/jcarver989/aws-lambda4s). Let me tell you just how easy it is to use.

### Writing a Scala Lambda Is Just A Few Lines Of Code

```scala
import com.amazonaws.services.lambda.runtime.Context
import lambda4s._

/** aws-lambda4s supports automatic serialization of
these case classes to/from JSON */
case class InputItem(sku: String)
case class OutputItem(name: String, price: Double)

class MyLambda extends LambdaFunction[InputItem, OutputItem] {
    override def handle(input: InputItem, context: Context): OutputItem = {
        logger.info(s"yay, logging!") // logging is already set up for you
        OutputItem(product.name, product.price)
    }
}
```

### Writing a REST API using Lambda Is Just as easy

```scala
import com.amazonaws.services.lambda.runtime.Context
import lambda4s._

// pretend Users are a domain object that lives in a database
case class User(id: String, name: String)

class MyAPI extends LambdaProxyFunction {
    override def handle(request: Request, context: Context): Response = {
       // easy API route matching built right in
       // no crazy syntax, just normal Scala pattern matching
        request match {
            case Get("users", userId) =>
              val user = someDatabase.findById(userId)
              Response(body = JSON.toJSON(user))

            case Post("users") =>
              val user = JSON.fromJSON[User](request.body)
              someDatabase.create(user)
              Response(statusCode = 200, body = """{"status": "success"}""")
        }
    }
}
```

### Conclusion

That's it. You can [find aws-lambda4s on Github](https://github.com/jcarver989/aws-lambda4s) and I have a full working
example using `aws-lambda4s` that's deployable with a single command [here](https://github.com/jcarver989/aws-lambda4s-example).
