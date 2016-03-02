---
layout: post
title: Get Beautiful JavaScript charts for your app in minutes
---

### Charts Today Suck
Getting a nice looking chart for your app or website can be a struggle. There are many charting libraries currently out there, but they tend to be way too complicated and come with reams of documentation. It can take hours just to learn how to get a decent chart on the page. If you want to customize those charts - good luck you'll have learn a ton of arcane settings and tweaks to get the colors and styling to where you want - all of that takes precious time.

Charts shouldn't be hard, they **should be easy**. It should only take a few minutes to get a good chart into your app or website. They should be responsive by default and work across various screen sizes and devices. And if you want to customize the chart, ideally you could just write a few lines of CSS and change the labels, colors etc. 


### Enter Suave Charts
I took all my frustrations with charting libraries decided to solve them by creating a new, better charting library - [Suave Charts](http://suavecharts.com). Suave Charts is a modern library designed to be super easy to use, responsive & you can customize it with just a few lines of CSS. Currently it supports **line, bar, histogram, and donut charts**. Check out the examples below:


<div id="chart"></div>
<div id="horizontal-bar"></div>
<div style="margin-bottom: 2rem;" id="basic-donut"></div>

### Get Suave Charts
You can download Suave Charts and find many more examples, including code on the website, just click the button below: 

<a href="http://suavecharts.com/" class="bordered pill green button">Get Suave Charts</a>

<script type="text/javascript">
var labels = []
var data = []
for (i = 0; i < 21; i++) {
  labels.push(i)
  data.push(Math.round(Math.random(i) * i *100))
}

chart = new Suave.LineChart("#chart")

// Draw the chart
chart.draw({
  labels: labels, 
  lines: [ 
    { label: "line1", values: data  }
  ]
})
</script>

<script>
function rand() { 
  return Math.round(Math.random() * 10)
}


// Create a bar chart
var chart = new Suave.BarChart(
  "#horizontal-bar", 
  { layout: "horizontal" }
)

// Draw the chart
chart.draw({
  labels: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
  ],

  bars: [
    [rand(), rand(), rand()],
    [rand(), rand(), rand()],
    [rand(), rand(), rand()],
    [rand(), rand(), rand()],
    [rand(), rand(), rand()]
  ]
})

var chart = new Suave.DonutChart("#basic-donut", {
  // Controls the size of the donut hole [0 to 1]. 
  // For a pie chart, set this to 0
  holeSize: 0.5 
})

// Draw the chart
chart.draw([ 
  ["Monday", 10],
  ["Tuesday", 9],
  ["Wednesday", 5],
  ["Thursday", 11],
  ["Friday", 20],
  ["Saturday", 13],
  ["Sunday", 7]
])
</script>



