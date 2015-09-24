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

  $("#connect-form").attr("action", "http://webclient.pokemon-online.eu/");
});

function submitConnectForm() {
  $("#connect-form").attr("action", $("#connect-form").attr("action") + "?relay=" + $("#relay").val() + "&port=" + $("#port").val()
    + "&user=" + $("#user").val());

  document.forms["connect"].submit();
}