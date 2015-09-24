$(function() {
  $(document).on("click", ".banned .btn", function(event) {
    $.ajax({
      url: "unban",
      type: "GET",
      data: {"ip": $(this).attr('ip')}
    });
  });

  $(document).on("click", ".ban-btn", function(event) {
    $.ajax({
      url: "ban",
      type: "GET",
      data: {"ip": $(this).attr('ip')}
    });
  });

  $(document).on("click", ".connect-btn", function(event) {
    $('#relay').val($(this).attr('ip'));
    $('#port').val($(this).attr('port'));

    submitConnectForm();
  });

  $(document).on("click", "#main-connect-button", function(event) {
    submitConnectForm();
    return false;
  });
});

function submitConnectForm() {
  var action = $("#connect-form").attr("action");
  var newAction = action.substring(0, action.lastIndexOf("/")+1) + "?relay=" + $("#relay").val() + "&port=" + $("#port").val()
    + "&user=" + $("#user").val();

  $("#connect-form").attr("action", newAction);

  document.location.href = newAction;
  //document.forms["connect"].submit();
}