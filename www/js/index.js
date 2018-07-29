const api = "http://localhost:3030/api";

const notarizeSubmitBtn = document.getElementById("notarizeSubmitBtn");
notarizeSubmitBtn.addEventListener("click", function (e) {
    e.preventDefault();

    let reCaptchaResponse = grecaptcha.getResponse();

    if(reCaptchaResponse.length == 0) {
        alert("Solve recaptcha first");
        return;
    }

    $("#resultNotarize").html("");

    let name = $("#inputNotarizeName").val();
    let hash = $("#inputNotarizeHash").val();

    $.ajax({
        url: api + "/add",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ hash: hash, name: name, "g-recaptcha-response": reCaptchaResponse }),
        dataType: "json",
        success: function (res) {
            if (!res.result) {
                alert("Something is wrong");
            } else {
                if (res.result.notary && res.result.permlink) {
                    $("#resultNotarize").html(`<b><a href="https://golos.cf/@${res.result.notary}/${res.result.permlink}">Document Added</b>`);
                } else {
                    $("#resultNotarize").html("<b style='color: red;'>Something is wrong</b>");
                }
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.log(thrownError);
            $("#resultNotarize").html("<b style='color: red;'>"+thrownError+": "+xhr.responseText+"</b>");
        }
    });


});

const verifySubmitBtn = document.getElementById("verifySubmitBtn");
verifySubmitBtn.addEventListener("click", function (e) {
    e.preventDefault();
    $("#resultVerify").html("");

    let hash = $("#inputVerifyHash").val();

    $.ajax({
        url: api + "/verify",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ hash: hash }),
        dataType: "json",
        success: function (res) {
            if (!res.result) {
                alert("Something is wrong");
            } else {
                if (res.result.id && res.result.id > 0) {
                    $("#resultVerify").html(`<b>Document Found</b><br\>
<b>Name:</b> ${res.result.document.name}<br\>
<b>Hash:</b> ${res.result.document.hash}<br\><br\>
<a href="https://golos.cf/@${res.result.notary}/${res.result.permlink}">See in explorer</b>`);
                } else {
                    $("#resultVerify").html("<b style='color: red;'>Document not found</b>");
                }
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            alert(xhr.status);
            console.error(thrownError);
        }
    });
});
