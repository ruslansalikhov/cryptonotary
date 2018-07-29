const fs = require("fs");
const golos = require('golos-js');
const Promise = require("bluebird");

const Recaptcha = require('express-recaptcha').Recaptcha;

let config = {};
let account = null;
let version = '1.1.0';

startup();

function startup() {
    // Load the settings from the config file
    loadConfig();

    // Connect to the specified RPC node
    const rpc_node = config.rpc_node ? config.rpc_node : 'https://api.golos.blckchnd.com';
    golos.config.set('url', rpc_node);

    console.log("* START - Version: " + version + " *");
    console.log("Connected to: " + rpc_node);

    // If the API is enabled, start the web server
    const express = require('express');
    const bodyParser = require('body-parser');
    const app = express();
    const port = process.env.PORT || config.api.port;

    const recaptcha = new Recaptcha(config.recaptcha.site_key, config.recaptcha.secret_key);

    app.use(bodyParser.json());

    // CORS
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.post("/api/verify", (req, res) => {

        if (!req.body.hash) {
            return res.status(403).send({
                error: "No hash"
            });
        }

        return checkDocument({
            hash: req.body.hash
        }).then(result => {
            if (result.id > 0) {
                return res.status(200).send({
                    result: {
                        id: result.id,
                        notary: config.account,
                        permlink: req.body.hash,
                        document: JSON.parse(result.body)
                    }
                });
            } else {
                return res.status(200).send({
                    result: {id: null}
                });
            }
        }).catch(err => {
            return res.status(403).send({
                error: err.toString()
            });
        });
    });

    app.post("/api/add", (req, res) => {
        if (!req.body.hash) {
            return res.status(403).send({
                error: "No hash"
            });
        }

        recaptcha.verify(req, function(error, data){
            if (!error) {
                return postDocument({
                    hash: req.body.hash,
                    name: req.body.name
                }).then(result => {
                    return res.status(200).send({
                        result: {
                            notary: config.account,
                            permlink: req.body.hash
                        }
                    });
                }).catch(err => {
                    return res.status(403).send({
                        error: err.toString()
                    });
                });
            } else {
                return res.status(403).send({
                    error: "Bad catcha"
                });
            }
        });


    });

    app.listen(port, () => console.log('API running on port ' + port))
}

function postDocument(document) {

    return checkDocument(document).then(result => {

        if (result.id > 0) {
            return Promise.reject("Document already exists");
        } else if(result && result.id == 0) {
            // Generate the comment permlink via steemit standard convention
            let permlink = document.hash;
            let body = JSON.stringify(document);

            // Broadcast the new post
            return Promise.promisify(golos.broadcast.comment)(config.posting_key, "", "test", config.account, permlink,
                document.hash, body, '{"app":"notary/' + version + '"}');
        }

    });
}

function checkDocument(document) {
    // Parse the author and permlink from the memo URL
    let permLink = document.hash;

    return golos.api.getContent(config.account, permLink);
}

function loadConfig() {
    config = JSON.parse(fs.readFileSync("config.json"));
}
