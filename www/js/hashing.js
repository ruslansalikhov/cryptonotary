// https://github.com/lvaccaro/hashfilereader

// Hashing file
let chunkSize = 1024 * 1024; // bytes
let timeout = 10; // millisec

let inputFile = document.getElementById("inputNotarizeFile");
inputFile.addEventListener("change", handleFiles, false);
$("#inputNotarizeFile").click(() => {
    clear();
});

let inputVerifyFile = document.getElementById("inputVerifyFile");
inputVerifyFile.addEventListener("change", handleFiles, false);
$("#inputVerifyFile").click(() => {
    clear();
});

function handleFiles() {
    let file = this.files[0];
    if (file === undefined) {
        return;
    }
    let SHA256 = CryptoJS.algo.SHA256.create();
    let counter = 0;
    let self = this;

    loading(file,
        function (data) {
            let wordBuffer = CryptoJS.lib.WordArray.create(data);
            SHA256.update(wordBuffer);
            counter += data.byteLength;
            console.log((( counter / file.size) * 100).toFixed(0) + '%');
        }, function (data) {
            console.log('100%');
            let encrypted = SHA256.finalize().toString();
            $("#inputNotarizeHash").val(encrypted);
            $("#inputVerifyHash").val(encrypted);

        });
}

function clear() {
    $("#inputNotarizeHash").val('');
    $("#inputVerifyHash").val('');

    lastOffset = 0;
    chunkReorder = 0;
    chunkTotal = 0;
}


function loading(file, callbackProgress, callbackFinal) {
    //var chunkSize  = 1024*1024; // bytes
    let offset = 0;
    let size = chunkSize;
    let partial;
    let index = 0;

    if (file.size === 0) {
        callbackFinal();
    }
    while (offset < file.size) {
        partial = file.slice(offset, offset + size);
        let reader = new FileReader;
        reader.size = chunkSize;
        reader.offset = offset;
        reader.index = index;
        reader.onload = function (evt) {
            callbackRead(this, file, evt, callbackProgress, callbackFinal);
        };
        reader.readAsArrayBuffer(partial);
        offset += chunkSize;
        index += 1;
    }
}

function callbackRead(obj, file, evt, callbackProgress, callbackFinal) {
    //callbackRead_buffered(obj, file, evt, callbackProgress, callbackFinal);
    callbackRead_waiting(obj, file, evt, callbackProgress, callbackFinal);
}

let lastOffset = 0;
let chunkReorder = 0;
let chunkTotal = 0;
// time reordering
function callbackRead_waiting(reader, file, evt, callbackProgress, callbackFinal) {
    if (lastOffset === reader.offset) {
        console.log("[", reader.size, "]", reader.offset, '->', reader.offset + reader.size, "");
        lastOffset = reader.offset + reader.size;
        callbackProgress(evt.target.result);
        if (reader.offset + reader.size >= file.size) {
            lastOffset = 0;
            callbackFinal();
        }
        chunkTotal++;
    } else {
        console.log("[", reader.size, "]", reader.offset, '->', reader.offset + reader.size, "wait");
        setTimeout(function () {
            callbackRead_waiting(reader, file, evt, callbackProgress, callbackFinal);
        }, timeout);
        chunkReorder++;
    }
}
// memory reordering
let previous = [];
function callbackRead_buffered(reader, file, evt, callbackProgress, callbackFinal) {
    chunkTotal++;

    if (lastOffset !== reader.offset) {
        // out of order
        console.log("[", reader.size, "]", reader.offset, '->', reader.offset + reader.size, ">>buffer");
        previous.push({offset: reader.offset, size: reader.size, result: reader.result});
        chunkReorder++;
        return;
    }

    function parseResult(offset, size, result) {
        lastOffset = offset + size;
        callbackProgress(result);
        if (offset + size >= file.size) {
            lastOffset = 0;
            callbackFinal();
        }
    }

    // in order
    console.log("[", reader.size, "]", reader.offset, '->', reader.offset + reader.size, "");
    parseResult(reader.offset, reader.size, reader.result);

    // resolve previous buffered
    var buffered = [{}]
    while (buffered.length > 0) {
        buffered = previous.filter(function (item) {
            return item.offset === lastOffset;
        });
        buffered.forEach(function (item) {
            console.log("[", item.size, "]", item.offset, '->', item.offset + item.size, "<<buffer");
            parseResult(item.offset, item.size, item.result);
            previous.remove(item);
        })
    }

}

Array.prototype.remove = Array.prototype.remove || function (val) {
        var i = this.length;
        while (i--) {
            if (this[i] === val) {
                this.splice(i, 1);
            }
        }
    };