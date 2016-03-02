---
layout: post
title: Averages Are Evil 
---

Averages are such a useful tool. They give us this super power to summarize a large amount of information into a single, easy to understand metric. We can look at things like the average latency of a system or the average revenue per customer and easily get an idea of what things *typically* look like.

But averages are evil, conniving little bastards that **lie to us all the time**.

### Why Do Averages Lie To Us?

The problem with averages isn't their calculation, after all even elementary school children can correctly compute averages. The problem is we apply averages blindly without stopping to think about what the average is actually doing and by extension what assumptions about the data we're making. 


#### Averages Assume A Tight Even Distribution
Averages sum up the total value across N items, then split that total value into N equal parts. Since we assign each item an equal value of the total sum, we're implicitly assuming that our data is reasonably packed together - i.e. when talking about average customer revenue, we assume most customers tend to have similar amounts of revenue. 

In other words **we assume that data is normally distrbuted** - aka the shape of the values looks something like this: 


<div id="normalDistribution"></div>
<strong style="display: block; text-align: center;" id="normalAverage"></strong>

For data that follows this type of distribution, averages will work...OK. Since the average winds up in the center mass of the data things aren't terrible but even then its easy to see that the average winds up being pretty far from quite a bit of our data. 

#### When Averages Fail

But what happens when data doesn't follow a normal distribution, aka the distribution is *skewed*?

<div id="skewedDistribution"></div>
<strong style="display: block; text-align: center;" id="skewedAverage"></strong>

Now the average tells us nothing useful about our data. So much of the data isn't anywhere close to the average that taking the average is pretty pointless.

#### Averages Lie To You When:

- Your data is too spread out (i.e. has a high varience)
- When your data is skewed (not normally distributed)

### Your Data Isn't Normal Or Tightly Packed

The thing is, it's very likely your data isn't likely to be normally distributed with a low varience. Things like system latency, exception counts, customer revenue, conversion rates by ad etc. are very often not normally distributed but instead follow a [power law distribution](https://en.wikipedia.org/wiki/Power_law). Averages are terrible for that kind of distribution and especially terrible when the varience is high...which is basically all the damn time in software
engineering. 

### Do This Instead

Instead of averages use **distributions** aka histograms. Any summarization of data will lie to you on some level because it's inherintely a lossy compression of a larger data set. But histograms lie to you much less than avearges by showing you the shape of the distribution and giving you a much better idea if there even is a *typical* value in your dataset.

If you must use a single summary statistic, use a **percentile**. Saying "90% of the data is above/below this value" is much better than just an average. 

#### But Histograms Take Longer To Build Than Averages!

No they don't - at least not anymore. Here's two really easy ways to get a nice historgam of your dataset in few minutes or less:

1. [Suave Viz](http://github.com/jcarver989/suave-viz). Gives you 1 command to instantly chart your data.

2. [Suave Charts](http://suavecharts.com). A super easy to use JavaScript charting library. 


<script>
function average(values, elm) {
  var avg = 0
  values.forEach(function(v) {
    avg += v
  })

  avg = (avg / values.length).toFixed(2)
  elm.innerText = "average: " + avg
}
</script>

<script>
var chart = new Suave.Histogram("#normalDistribution", { domain: [-10, 10] })

var values = []
for (var i = 0; i < 1000; i++) {
  // generate a bell curve
  var random = Math.random() + 
  Math.random() + 
  Math.random() + 
  Math.random() + 
  Math.random() + 
  Math.random()
  values.push(Math.round((random - 3) / 3 * 10))
}

  // Draw the chart
chart.draw({
  values: values,
})


average(values, document.querySelector("#normalAverage"))
</script>

<script>
var chart = new Suave.Histogram("#skewedDistribution")

var values = []
for (var i = 0; i < 1000; i++) {
  // generate a bell curve
  var random = Math.random() 
  values.push(random * i / 10)
}

  // Draw the chart
chart.draw({
  values: values,
})


average(values, document.querySelector("#skewedAverage"))
</script>
