#!/usr/bin/env ruby

require 'fileutils'

raise "Usage: ./create_post.rb <post_title>" if ARGV.length < 1 
post_title = ARGV[0]
FileUtils.touch "_posts/#{Time.now.strftime('%Y-%m-%d')}-#{post_title}.textile"

