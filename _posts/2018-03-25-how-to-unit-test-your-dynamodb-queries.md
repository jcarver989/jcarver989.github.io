---
layout: post
title: How I Like To Run DynamoDB Locally
---

### Overview

You may already know that you can run [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) locally via [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html). While it's great that you can run an instance of DynamoDB locally to test against, there's a few drawbacks:

1.  It sucks that all your tests have to talk to the same DB instance, meaning we can't run our tests in parallel.
2.  We have to rig our build system to launch DynamoDB prior to our automated tests running and stop DynamoDB when they're done.

If you're using a JVM based language, it turns out you can actually instantiate a DynamoDB instance by just calling out to regular Java classes. This allows us to give each test, or test suite its own instance of DynamoDB and handle setup/teardown using the `beforeEach` / `afterEach` features offered by our test framework of choice.

### Walkthrough

Here is a full working example of how to set this up. While this example uses Scala and SBT (Scala's default build system), it should be transferable to any JVM language and build system.

#### Dependencies

##### Standard Dependencies

First we need to drop in the standard dependencies, here's what it would look like in SBT:

```scala
# Add the DynamoDB Local repository
resolvers += "DynamoDB Local Release Repository" at "https://s3-us-west-2.amazonaws.com/dynamodb-local/release"

# Dynamo DB API
libraryDependencies += "com.amazonaws" % "aws-java-sdk-dynamodb" % "latest.integration"

# Dynamo DB Local
libraryDependencies += "com.amazonaws" % "DynamoDBLocal" % "latest.integration" % "test"
```

##### Native Lib Dependencies

DynamoDB Local depends on `sqlite4java` which requires a native library for your platform (e.x. windows, linux, osx etc.). Fortunately, we don't have to install anything ourselves and we can make the build system set things up for us by writing a short custom task to copy the native libraries to a place where the JVM can find them. Here are the dependencies you'll need and an SBT task to copy them to the right place:

```scala
# native libs
libraryDependencies += "com.almworks.sqlite4java" % "sqlite4java" % "latest.integration" % "test"
libraryDependencies += "com.almworks.sqlite4java" % "sqlite4java-win32-x86" % "latest.integration" % "test"
libraryDependencies += "com.almworks.sqlite4java" % "sqlite4java-win32-x64" % "latest.integration" % "test"
libraryDependencies += "com.almworks.sqlite4java" % "libsqlite4java-osx" % "latest.integration" % "test"
libraryDependencies += "com.almworks.sqlite4java" % "libsqlite4java-linux-i386" % "latest.integration" % "test"
libraryDependencies += "com.almworks.sqlite4java" % "libsqlite4java-linux-amd64" % "latest.integration" % "test"

lazy val copyJars = taskKey[Unit]("copyJars")
copyJars := {
  import java.nio.file.Files
  import java.io.File
  // For Local Dynamo DB to work, we need to copy SQLLite native libs from
  // our test dependencies into a directory that Java can find ("lib" in this case)
  // Then in our Java/Scala program, we need to set System.setProperty("sqlite4java.library.path", "lib");
  // before attempting to instantiate a DynamoDBEmbedded instance
  val artifactTypes = Set("dylib", "so", "dll")
  val files = Classpaths.managedJars(Test, artifactTypes, update.value).files
  Files.createDirectories(new File(baseDirectory.value, "native-libs").toPath)
  files.foreach { f =>
    val fileToCopy = new File("native-libs", f.name)
    if (!fileToCopy.exists()) {
      Files.copy(f.toPath, fileToCopy.toPath)
    }
  }
}

(compile in Compile) := (compile in Compile).dependsOn(copyJars).value
```

#### Hooking it all up

Now that we have all the dependencies set up, we just need to write a base class (trait here) that our DynamoDB test classes can extend. I'm using ScalaTest here but it should be pretty easy to translate to your test framework of choice.

```scala
import org.scalatest.{ BeforeAndAfterEach, Suite }
import com.amazonaws.services.dynamodbv2.local.embedded.DynamoDBEmbedded

trait DynamoDbTest extends BeforeAndAfterEach { this: Suite =>
  // this is key, it's what allows the JVM to find our native lib dependencies
  System.setProperty("sqlite4java.library.path", "native-libs")

  // creates an in-memory instance of DynamoDB, unique to this test-suite
  // since suites run in parallel, we don't need to worry about multiple tests within a particular suite
  // stepping on each other's toes.
  protected val dynamo = DynamoDBEmbedded.create().amazonDynamoDB()

  override def beforeEach() {
    super.beforeEach()
    // do any necessary setup, e.g. create dynamo tables or secondary indexes using 'dyanmo' here
  }

  override def afterEach() {
    super.afterEach()
    // do any necessary tear down, e.g. delete tables
  }
}
```

Now all of our unit tests can just extend this trait, e.g.:

```scala
 class UsersServiceTest extends DynamoDbTest with FlatSpec with Matchers {
   it should "write something to the db" in {
     dynamo.putItem(...)
   }
 }
```

That's it! Now you can run your DynamoDB tests in parallel.
