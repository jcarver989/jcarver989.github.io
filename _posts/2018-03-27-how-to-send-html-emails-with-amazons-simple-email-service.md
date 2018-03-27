---
layout: post
title: How To Send Emails With Attachments Using Amazon's Simple Email Service
---

[Amazon's Simple Email Service](https://aws.amazon.com/ses/) (SES) is a great tool that lets you
send emails cheapely. Unfortunately their API can be super annoying to work with.

If you're just sending HTML emails things really aren't so bad.
This is a Java example taken straight from Amazon's docs, slightly modified for Scala:

```scala
val client = AmazonSimpleEmailServiceClientBuilder
  .standard()
  .withRegion(Regions.US_WEST_2)
  .build()

val request = new SendEmailRequest()
  .withDestination(new Destination().withToAddresses("bilbo.baggins@gmail.com"))
  .withMessage(new Message()
  .withBody(new Body()
    .withHtml(new Content()
    .withCharset("UTF-8").withData("<h1>Hello World</h1>"))
    .withText(new Content()
    .withCharset("UTF-8").withData("Hello world 2")))
  .withSubject(new Content()
  .withCharset("UTF-8").withData("Hello World")))
  .withSource("p.diddy@gmail.com")

client.sendEmail(request)
```

### What If I Want To Send An Attachment - like a PDF?

Well shit son, you're fucked because now
you have to use the `sendRawEmail` function - which expects a `ByteBuffer`. That's right, to send an attachment,
via SES, you need to turn your email into a fucking `ByteBuffer` using
the [JavaMail API](http://www.oracle.com/technetwork/java/javamail/index.html).

Just to make your eyes, bleed here's the full example (again taken from Amazon's docs & adapted to Scala):

```scala
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.ByteBuffer;
import java.util.Properties;

import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.mail.internet.MimeUtility;

import com.amazonaws.regions.Regions;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailService;
import com.amazonaws.services.simpleemail.AmazonSimpleEmailServiceClientBuilder;
import com.amazonaws.services.simpleemail.model.RawMessage;
import com.amazonaws.services.simpleemail.model.SendRawEmailRequest;

  val DefaultCharSet = MimeUtility.getDefaultJavaCharset()
  val session = Session.getDefaultInstance(new Properties())
  val message = new MimeMessage(session)
  message.setSubject(SUBJECT, "UTF-8")
  message.setFrom(new InternetAddress(SENDER))
  message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(RECIPIENT))

  val msg_body = new MimeMultipart("alternative")
  val wrap = new MimeBodyPart()
  val textPart = new MimeBodyPart()
  textPart.setContent(MimeUtility
          .encodeText(BODY_TEXT,DefaultCharSet,"B"), "text/plain charset=UTF-8")
  textPart.setHeader("Content-Transfer-Encoding", "base64")

  val htmlPart = new MimeBodyPart()
  htmlPart.setContent(MimeUtility
          .encodeText(BODY_HTML,DefaultCharSet,"B"),"text/html charset=UTF-8")
  htmlPart.setHeader("Content-Transfer-Encoding", "base64")

  msg_body.addBodyPart(textPart)
  msg_body.addBodyPart(htmlPart)

  wrap.setContent(msg_body)

  msg = new MimeMultipart("mixed")
  message.setContent(msg)
  msg.addBodyPart(wrap)

  att = new MimeBodyPart()
  fds = new FileDataSource(ATTACHMENT)
  att.setDataHandler(new DataHandler(fds))
  att.setFileName(fds.getName())

  msg.addBodyPart(att)

  val client =
      AmazonSimpleEmailServiceClientBuilder.standard()
      .withRegion(Regions.US_WEST_2).build()

  message.writeTo(out)

  val outputStream = new ByteArrayOutputStream()
  message.writeTo(outputStream)
  val rawMessage = new RawMessage(ByteBuffer.wrap(outputStream.toByteArray()))

  val rawEmailRequest = new SendRawEmailRequest(rawMessage)
      .withConfigurationSetName(CONFIGURATION_SET)

  client.sendRawEmail(rawEmailRequest)
```

Ugh, what a pain in the ass. Can't I just give this API a list of attachments
and the library can figure out all this shit for me?

### There should be a better way

Ideally sending an HTML email with an attachment should be as easy as:

```scala
// this is ok because binary files
// should really be represented as Bytes
val someAttachment: Array[Byte] = ...

val emailService = EmailServiceImpl()
emailService.sendEmail(Email(
  from = "stewie.griffin@gmail.com",
  to = "peter.griffin@gmail.com",
  subject = "Ha ha, ha hahaha",
  content = HTML("<h1>Victory is mine!</h1>"),
  attachments = Seq(Attachment(
    fileName = "world-domination.pdf",
    mimeType = "application/pdf",
    bytes = someAttachment))
))
```

### Turns Out There Is A Better Way

I've written a micro-library for Scala, aws-ses4s to do exactly this - now you don't need to
think about how to to turn your emails into fucking `ByteBuffers` you can just send them like
a human wants to describe them: from/to, content, list of attachments.

You can find [aws-ses4s on Github](https://github.com/jcarver989/aws-ses4s) under the Apache 2.0 license.
If you're using SBT, getting this into your project is as easy as adding these two lines to your `build.sbt`:

```scala
resolvers += Resolver.bintrayRepo("jcarver989", "maven")
libraryDependencies += "com.jcarver989" %% "aws-ses4s" % "latest.integration"
```

### Wait What About Email Templates?

If you came here looking for tips on how to do HTML email templating, I'd highly recommend
[MJML](https://mjml.io/) - which is open source and makes writing HTML files a breeze, there's
even a [Visual Studio Code plugin](https://marketplace.visualstudio.com/items?itemName=attilabuti.vscode-mjml)
that gives you a live HTML preview of your MJML emails.
