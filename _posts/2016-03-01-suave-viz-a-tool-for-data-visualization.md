---
layout: post
title: Instantly Visualize Your Data With 1 Command
---

### Welcome To The Age of Data
All of us work with data in some way or another on a daily basis - from software engineers to data scientists to business analysts. Often when we get some new data we need to start exploring it to get a sense for what it is and what it looks like - let's call this step *exploritory data analysis*.  

A major part of exploritory data analsys involves charting that data - for example if you were looking at a dataset comprised of retail sales you might want to chart the distribution of sales by region or by sales rep. If you were looking at stock data you'd want to plot it on a time series to see what happened to the price(s) of the stock(s) over time. 

So you have some data and now you need to chart it, what do you do?

You have two options, you can use a command line tool such as GNUplot or use a graphical tool like Microsoft Excel. The problem is if you have to do this kind of stuff with any frequency both types of tools slow you down tremendously. Tools like GNUplot require a ton of time to learn and boilerplate setup code. On the other hand importing data into Excel and tweaking all the chart settings can be time consuming. 

The thing is our tools for exploritory data analysis - **kinda suck**.

### A Better Way
It'd be great if we had just had 1 command to instantly visualize our data. We could just feed it any TSV or CSV file and it would spit out a great looking, interactive chart that helped us understand our data better.

That's exactly what my new tool, [Suave-Viz](http://github.com/jcarver989/suave-viz) does. You just feed it some data and it graphs it in an interactive JavaScript chart for you. Assuming you have some data: 

{% highlight bash %}
cat docs/example-data/multi-series.tsv | head -n 10
date	APPL	TWTTR	FBX
20111001	63.4	62.7	72.2
20111002	58.0	59.9	67.7
20111003	53.3	59.1	69.4
20111004	55.7	58.8	68.0
20111005	64.2	58.7	72.4
20111006	58.8	57.0	77.0
20111007	57.9	56.7	82.3
20111008	61.8	56.8	78.9
20111009	69.3	56.7	68.8
{% endhighlight %}

You can graph it instantly with just 1 simple command like this: 

{% highlight bash %}
cat docs/example-data/multi-series.tsv | suave
{% endhighlight %}

![suave]({{site.url}}/images/suave-viz.jpg)

There's lots more it can do including histograms, bar charts, and linear/log/time-series scales. Since Suave Viz supports UNIX style pipes into stdin you can even graph the results of SQL queries directly! You can find docs and more examples on my github page: [Check it out](http://github.com/jcarver989/suave-viz)
