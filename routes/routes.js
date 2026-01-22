"use strict";

var pg = require('pg');


var appRouter = function(app) {

    app.get("/districts", function(req, res) {

        var db = 'dola';
        var schema = 'bounds';
        var tname = 'districts';

        var limit = req.query.limit || 5000; //by default limits to 1000 search results.  override by setting limit= in GET string
        var active = req.query.active || '0'; //comma delimited list of lgstatusid's, if '0' then all

        var activearray = [];
        var filterarray = [];


        if (active !== '0') {
            activearray = active.split(",");
            var activestr = "";

            activearray.forEach(function(a) {
                activestr = activestr + " lgstatusid='" + a + "' or";
            });

            activestr = activestr.slice(0, -2);
            activestr = " and (" + activestr + ")";

        } else {
            activestr = '';
        }


        var filter = req.query.filter || '0'; //comma delimited list of lgtypeid's, if '0' then all

        if (filter !== '0') {
            filterarray = filter.split(",");
            var filterstr = "";

            filterarray.forEach(function(b) {
                filterstr = filterstr + " lgtypeid='" + b + "' or";
            });

            //trim last trailing 'or'
            filterstr = filterstr.slice(0, -2);
            filterstr = " and (" + filterstr + ")";

        } else {
            filterstr = '';
        }

        var ctf = req.query.ctf || '0'; //comma delimited list of lgstatusid's, if '0' then all

        var ctfarray = [];
        var ctffilterarray = [];


        if (ctf !== '0') {
            ctfarray = ctf.split(",");
            var ctfstr = "";

            ctfarray.forEach(function(a) {
                ctfstr = ctfstr + " ctf='" + a + "' or";
            });

            ctfstr = ctfstr.slice(0, -2);
            ctfstr = " and (" + ctfstr + ")";

        } else {
            ctfstr = '';
        }


        var filter = req.query.filter || '0'; //comma delimited list of lgtypeid's, if '0' then all

        if (filter !== '0') {
            filterarray = filter.split(",");
            var filterstr = "";

            filterarray.forEach(function(b) {
                filterstr = filterstr + " lgtypeid='" + b + "' or";
            });

            //trim last trailing 'or'
            filterstr = filterstr.slice(0, -2);
            filterstr = " and (" + filterstr + ")";

        } else {
            filterstr = '';
        }

        var tolerance = 0;

        //get simplify factor
        var zoom = req.query.zoom || 17;

        //type coercion okay here
        if (zoom == 2) {
            tolerance = 0.2;
        } //past minZoom
        if (zoom == 3) {
            tolerance = 0.1;
        } //past minZoom
        if (zoom == 4) {
            tolerance = 0.07;
        } //past minZoom
        if (zoom == 5) {
            tolerance = 0.04;
        } //past minZoom
        if (zoom == 6) {
            tolerance = 0.018;
        }
        if (zoom == 7) {
            tolerance = 0.01;
        }
        if (zoom == 8) {
            tolerance = 0.005;
        }
        if (zoom == 9) {
            tolerance = 0.003;
        }
        if (zoom == 10) {
            tolerance = 0.0015;
        }
        if (zoom == 11) {
            tolerance = 0.001;
        }
        if (zoom == 12) {
            tolerance = 0.0005;
        }
        if (zoom == 13) {
            tolerance = 0.00025;
        }
        if (zoom == 14) {
            tolerance = 0.0001;
        }
        if (zoom == 15) {
            tolerance = 0.0001;
        }
        if (zoom == 16) {
            tolerance = 0.0001;
        }
        if (zoom == 17) {
            tolerance = 0;
        }


        var bbstr = ""; //bounding box string

        if (req.query.bb) {
            var bb = req.query.bb;
            bbstr = schema + "." + tname + ".geom && ST_MakeEnvelope(" + bb + ", 4326) ";
        } else {
            bbstr = " 1=1 ";
        } //bounding box example: "-105,40,-104,39" no spaces no quotes


        var lgid = req.query.lgid || ''; //comma delimited list of lgid's

        if (lgid !== '') {
            var lgidarray = lgid.split(",");
            var lgidstr = "";

            lgidarray.forEach(function(c) {
                lgidstr = lgidstr + " lgid='" + c + "' or";
            });

            lgidstr = lgidstr.slice(0, -2);
            lgidstr = "where (" + lgidstr + ")";

        } else {
            lgidstr = '';
        }


        var sql = "";

        if (req.query.lgid) {
            sql = "SELECT lgid, lastupdate, lgname, lgtypeid, lgstatusid, source, mail_address, alt_address, mail_city, mail_state, mail_zip, url, prev_name, abbrev_name, st_asgeojson(st_transform(ST_Simplify(geom," + tolerance + "),4326)) AS geojson from " + schema + "." + tname + " natural join " + schema + ".lgbasic " + lgidstr + ";";
        } else {
            sql = "SELECT lgid, lastupdate, lgname, lgtypeid, lgstatusid, source, mail_address, alt_address, mail_city, mail_state, mail_zip, url, prev_name, abbrev_name, st_asgeojson(st_transform(ST_Simplify(geom," + tolerance + "),4326)) AS geojson from " + schema + "." + tname + " natural join " + schema + ".lgbasic where " + bbstr + activestr + ctfstr + filterstr + " limit " + limit + ";";
        }


        sendtodatabase(sql);

        function sendtodatabase(sqlstring) {

            var conString = "postgres://codemog:demography@gis.dola.colorado.gov:5433/dola";  //this is a read only account, have fun!
            var client = new pg.Client(conString);

            client.connect(function(err) {
                if (err) {
                    return console.error('could not connect to postgres', err);
                }

                client.query(sqlstring, function(err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }

                    var resultdata = result.rows;
                    var output = '';
                    var rowOutput = '';

                    for (var t = 0; t < resultdata.length; t++) {

                        rowOutput = (rowOutput.length > 0 ? ',' : '') + '{"type": "Feature", "geometry": ' + resultdata[t]['geojson'] + ', "properties": {';
                        var props = '';
                        var id = '';

                        for (var key in resultdata[t]) {
                            if (resultdata[t].hasOwnProperty(key)) {

                                if (key !== "geojson") {
                                    props = props + (props.length > 0 ? ',' : '') + '"' + key + '":"' + resultdata[t][key].replace(/'/g, '').replace(/"/g, '').replace(/\//g, '').replace(/\\/g, '') + '"';
                                }
                                if (key === "id") {
                                    id = id + ',"id":"' + resultdata[t][key] + '"';
                                }
                            }
                        }

                        rowOutput = rowOutput + props + '}';
                        rowOutput = rowOutput + id;
                        rowOutput = rowOutput + '}';
                        output = output + rowOutput;

                    }

                    var arroutput = '{ "type": "FeatureCollection", "features": [ ' + output + ' ]}';

                    res.set({
                        "Content-Type": "application/json"
                    });
                    res.send(arroutput);

                    client.end();

                });
            });
        }
    });

     app.get("/districtstest", function(req, res) {

        var db = 'dola';
        var schema = 'bounds';
        var tname = 'districts';

        var limit = req.query.limit || 5000; //by default limits to 1000 search results.  override by setting limit= in GET string
        var active = req.query.active || '0'; //comma delimited list of lgstatusid's, if '0' then all

        var activearray = [];
        var filterarray = [];


        if (active !== '0') {
            activearray = active.split(",");
            var activestr = "";

            activearray.forEach(function(a) {
                activestr = activestr + " lgstatusid='" + a + "' or";
            });

            activestr = activestr.slice(0, -2);
            activestr = " and (" + activestr + ")";

        } else {
            activestr = '';
        }


        var filter = req.query.filter || '0'; //comma delimited list of lgtypeid's, if '0' then all

        if (filter !== '0') {
            filterarray = filter.split(",");
            var filterstr = "";

            filterarray.forEach(function(b) {
                filterstr = filterstr + " lgtypeid='" + b + "' or";
            });

            //trim last trailing 'or'
            filterstr = filterstr.slice(0, -2);
            filterstr = " and (" + filterstr + ")";

        } else {
            filterstr = '';
        }

        var ctf = req.query.ctf || '0'; //comma delimited list of lgstatusid's, if '0' then all

        var ctfarray = [];
        var ctffilterarray = [];


        if (ctf !== '0') {
            ctfarray = ctf.split(",");
            var ctfstr = "";

            ctfarray.forEach(function(a) {
                ctfstr = ctfstr + " ctf='" + a + "' or";
            });

            ctfstr = ctfstr.slice(0, -2);
            ctfstr = " and (" + ctfstr + ")";

        } else {
            ctfstr = '';
        }


        var filter = req.query.filter || '0'; //comma delimited list of lgtypeid's, if '0' then all

        if (filter !== '0') {
            filterarray = filter.split(",");
            var filterstr = "";

            filterarray.forEach(function(b) {
                filterstr = filterstr + " lgtypeid='" + b + "' or";
            });

            //trim last trailing 'or'
            filterstr = filterstr.slice(0, -2);
            filterstr = " and (" + filterstr + ")";

        } else {
            filterstr = '';
        }

        var tolerance = 0;

        //get simplify factor
        var zoom = req.query.zoom || 17;

        //type coercion okay here
        if (zoom == 2) {
            tolerance = 0.2;
        } //past minZoom
        if (zoom == 3) {
            tolerance = 0.1;
        } //past minZoom
        if (zoom == 4) {
            tolerance = 0.07;
        } //past minZoom
        if (zoom == 5) {
            tolerance = 0.04;
        } //past minZoom
        if (zoom == 6) {
            tolerance = 0.018;
        }
        if (zoom == 7) {
            tolerance = 0.01;
        }
        if (zoom == 8) {
            tolerance = 0.005;
        }
        if (zoom == 9) {
            tolerance = 0.003;
        }
        if (zoom == 10) {
            tolerance = 0.0015;
        }
        if (zoom == 11) {
            tolerance = 0.001;
        }
        if (zoom == 12) {
            tolerance = 0.0005;
        }
        if (zoom == 13) {
            tolerance = 0.00025;
        }
        if (zoom == 14) {
            tolerance = 0.0001;
        }
        if (zoom == 15) {
            tolerance = 0.0001;
        }
        if (zoom == 16) {
            tolerance = 0.0001;
        }
        if (zoom == 17) {
            tolerance = 0;
        }


        var bbstr = ""; //bounding box string

        if (req.query.bb) {
            var bb = req.query.bb;
            bbstr = schema + "." + tname + ".geom && ST_MakeEnvelope(" + bb + ", 4326) ";
        } else {
            bbstr = " 1=1 ";
        } //bounding box example: "-105,40,-104,39" no spaces no quotes


        var lgid = req.query.lgid || ''; //comma delimited list of lgid's

        if (lgid !== '') {
            var lgidarray = lgid.split(",");
            var lgidstr = "";

            lgidarray.forEach(function(c) {
                lgidstr = lgidstr + " lgid='" + c + "' or";
            });

            lgidstr = lgidstr.slice(0, -2);
            lgidstr = "where (" + lgidstr + ")";

        } else {
            lgidstr = '';
        }


        var sql = "";

        if (req.query.lgid) {
            sql = "SELECT lgid, lastupdate, lgname, lgtypeid, lgstatusid, source, mail_address, alt_address, mail_city, mail_state, mail_zip, url, prev_name, abbrev_name, st_asgeojson(st_transform(ST_Simplify(geom," + tolerance + "),4326)) AS geojson from " + schema + "." + tname + " natural join " + schema + ".lgbasic " + lgidstr + ";";
        } else {
            sql = "SELECT lgid, lastupdate, lgname, lgtypeid, lgstatusid, source, mail_address, alt_address, mail_city, mail_state, mail_zip, url, prev_name, abbrev_name, st_asgeojson(st_transform(ST_Simplify(geom," + tolerance + "),4326)) AS geojson from " + schema + "." + tname + " natural join " + schema + ".lgbasic where " + bbstr + activestr + ctfstr + filterstr + " limit " + limit + ";";
        }


        sendtodatabase(sql);

        function sendtodatabase(sqlstring) {

            //var conString = "postgres://codemog:demography@34.55.5.64:5432/dola";  //this is a read only account, have fun!
            //var client = new pg.Client(conString);

           // client.connect(function(err) {
                //if (err) {
                    //return console.error('could not connect to postgres', err);
                //}

                 import {Connector} from '@google-cloud/cloud-sql-connector';
                    const {Pool} = pg;
                    
                    const connector = new Connector();
                    const clientOpts = await connector.getOptions({
                      instanceConnectionName: 'dola-gis-server:us-central1:free-trial-first-project',
                      ipType: 'PUBLIC',
                    });
                    const pool = new Pool({
                      ...clientOpts,
                      user: 'codemog',
                      password: 'demography',
                      database: 'dola',
                      max: 5,
                    });
            
                pool.query(sqlstring, function(err, result) {
                    if (err) {
                        return console.error('error running query', err);
                    }

                    var resultdata = result.rows;
                    var output = '';
                    var rowOutput = '';

                    for (var t = 0; t < resultdata.length; t++) {

                        rowOutput = (rowOutput.length > 0 ? ',' : '') + '{"type": "Feature", "geometry": ' + resultdata[t]['geojson'] + ', "properties": {';
                        var props = '';
                        var id = '';

                        for (var key in resultdata[t]) {
                            if (resultdata[t].hasOwnProperty(key)) {

                                if (key !== "geojson") {
                                    props = props + (props.length > 0 ? ',' : '') + '"' + key + '":"' + resultdata[t][key].replace(/'/g, '').replace(/"/g, '').replace(/\//g, '').replace(/\\/g, '') + '"';
                                }
                                if (key === "id") {
                                    id = id + ',"id":"' + resultdata[t][key] + '"';
                                }
                            }
                        }

                        rowOutput = rowOutput + props + '}';
                        rowOutput = rowOutput + id;
                        rowOutput = rowOutput + '}';
                        output = output + rowOutput;

                    }

                    var arroutput = '{ "type": "FeatureCollection", "features": [ ' + output + ' ]}';

                    res.set({
                        "Content-Type": "application/json"
                    });
                    res.send(arroutput);

                    pool.end();
                    connector.close();

                });
            //});
        }
    });
}

module.exports = appRouter;
