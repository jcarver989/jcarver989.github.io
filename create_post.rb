#!/usr/bin/env ruby

require 'fileutils'

raise "Usage: ./create_post.rb <post_title>" if ARGV.length < 1 
post_title = ARGV[0]
filename  = "#{post_title.gsub(' ','-').gsub(/[^a-zA-Z0-9\-]/, '').downcase}.md"

File.open "_posts/#{Time.now.strftime('%Y-%m-%d')}-#{filename}", 'w' do |file|
  file.puts <<-TEXT
---
layout: post
title: #{post_title} 
---

# {{ page.title }}

  TEXT
end

