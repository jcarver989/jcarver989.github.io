(function($) {
  return $.fn.postForm = function(callback) {
    var data, url;
    url = this.attr('action');
    data = this.serialize();
    return $.post(url, data, function(response) {
      if (callback != null) {
        return callback(response);
      }
    });
  };
})(jQuery);var Validation;
Validation = (function() {
  function Validation() {}
  Validation.regexes = {
    email: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
  };
  Validation.email = function(address) {
    return this.regexes.email.test(address);
  };
  return Validation;
})();var ShareTemplates;
ShareTemplates = {
  twitter: "<a class=\"twitter-share-button\" \n   data-url=\"{{url}}\"\n   href=\"https://twitter.com/share\" \n   data-count=\"none\">\n     Tweet\n</a>\n\n<script src=\"http://platform.twitter.com/widgets.js\" \n        type=\"text/javascript\">\n</script>",
  facebook: "<div id=\"fb-root\">\n  <script type=\"text/javascript\">\n    (function(d, s, id) {\n      var js, fjs = d.getElementsByTagName(s)[0];\n      if (d.getElementById(id)) {return;}\n      js = d.createElement(s); js.id = id;\n      js.src = \"http://connect.facebook.net/en_US/all.js#xfbml=1\";\n      fjs.parentNode.insertBefore(js, fjs);\n    }(document, 'script', 'facebook-jssdk'));\n  </script>\n\n  <div class=\"fb-like\" \n       data-href=\"{{url}}\" \n       data-send=\"false\" \n       data-layout=\"button_count\" \n       data-width=\"300\" \n       data-show-faces=\"false\" \n       data-font=\"arial\">\n  </div>\n</div>",
  linkedin: "<script src=\"http://platform.linkedin.com/in.js\" type=\"text/javascript\"></script>\n<script type=\"IN/Share\" data-url=\"{{url}}\"></script>"
};var animate, animate_page_transition, render_social_links, setup_signup, show_form;
animate = function(left, right, callback) {
  var speed;
  speed = 400;
  left.animate({
    "margin-left": "0px"
  }, speed);
  return right.animate({
    "margin-right": "0px"
  }, speed, callback);
};
show_form = function(form, support) {
  return setTimeout(function() {
    return form.fadeIn(200, function() {
      form.animate({
        top: "30px"
      }, 200);
      return support.fadeIn(200, function() {
        return support.animate({
          "margin-top": "40px"
        }, 200);
      });
    });
  }, 100);
};
animate_page_transition = function(title, signup, post_signup) {
  return signup.fadeOut(400, function() {
    post_signup.fadeIn(200);
    $("#title").text(title);
    return $("#subtitle").text("We'll notify you soon. Want in faster? Invite your friends with the link below, if they signup, you move faster in line");
  });
};
render_social_links = function(link) {
  var data, render;
  render = Mustache.to_html;
  data = {
    url: link
  };
  $("#referral-link").text(link);
  $("#twitter-share").html(render(ShareTemplates.twitter, data));
  $("#linkedin-share").html(render(ShareTemplates.linkedin, data));
  return $("#facebook-share").html(render(ShareTemplates.facebook, data));
};
setup_signup = function(signup, post_signup, signup_button) {
  return signup_button.click(function(e) {
    var email;
    e.preventDefault();
    email = signup.find("#email").attr("value");
    if (!Validation.email(email)) {
      alert("Your email was invalid, typo?");
      return;
    }
    $(this).text("wait...");
    return signup.postForm(function(response) {
      if (response.status === "success") {
        render_social_links(response.referral_link);
        return animate_page_transition("Thanks for signing up", signup, post_signup);
      } else if (response.status === "registered") {
        render_social_links(response.referral_link);
        return animate_page_transition("You already signed up", signup, post_signup);
      } else {
        return alert(response.msg);
      }
    });
  });
};
$(document).ready(function() {
  var form, left, post_signup, right, signup, signup_button, support, time_visible;
  time_visible = 2000;
  left = $("#left-door");
  right = $("#right-door");
  form = $("#form");
  support = $("#supports");
  signup = $("#signup");
  post_signup = $("#post-signup");
  signup_button = $("#signup-button");
  setup_signup(signup, post_signup, signup_button);
  return setTimeout(function() {
    return animate(left, right, function() {
      return show_form(form, support);
    });
  }, 3000);
});
