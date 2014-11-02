var $ = require('unopinionate').selector
var onClick = require('onclick')
var transitionComplete = require('transition-complete')

$(function() {
  onClick('.entry .name', function() {
    var $this = $(this)
    var $entry = $this.closest('.entry')

    if ($entry.hasClass('open')) {
		//Close entry
      $entry
        .height($entry.height())
        .removeClass('open')

      setTimeout(function() {
        $entry.css('height', $entry.attr('data-height') + 'px')
      }, 0)

      transitionComplete(function() {
        $entry.find('.readme').remove()
        $entry.css('height', 'auto')
      })
    } else {
      //Open entry
      //Close open entries
      $('.entry.open').each(function() {
        var $entry = $(this)
        $entry
          .height($entry.height())
          .removeClass('open')

        setTimeout(function() {
          $entry.css('height', $entry.attr('data-height') + 'px')
        }, 0)

        transitionComplete(function() {
          $entry.find('.readme').remove()
          $entry.css('height', 'auto')
        })
      })

      //Add the open class
      $entry.addClass('open')

      //Explicitly set heights for transitions
      var height = $entry.height()
      $entry
        .attr('data-height', height)
        .css('height', height)

      //Get the data
      $.ajax({
        url: '/-/readme/'+$entry.attr('data-name')+'/'+$entry.attr('data-version'),
        dataType: 'text',
        success: function(html) {
          var $readme = $("<div class='readme'>")
            .html(html)
            .appendTo($entry)

          $entry.height(height + $readme.outerHeight())

          transitionComplete(function() {
            $entry.css('height', 'auto')
          })
        }
      })
    }
  })
})

