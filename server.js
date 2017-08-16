// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var request    = require('request');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// accessed at GET http://localhost:8080/api
router.get('/single', function(req, res) {
  var id = req.query.id ? req.query.id : "8979279";
  request("http://visualenergytech.com:9200/logstash-wanjiang/_search?&size=20000", function (error, response, body) {
    var raw = JSON.parse(body);

    var energy = {
      "nodes":[],
      "links":[]
    };

    var energy_2 = {
      "nodes":[],
      "links":[]
    };

    for (var i = 0; i < raw.hits.hits.length; i++) {
      energy.nodes.push({"id": raw.hits.hits[i]._source.ID, "name": raw.hits.hits[i]._source.DEVICE_TYPE + "(" + raw.hits.hits[i]._source.ID + ")", "node1_id": raw.hits.hits[i]._source.NODE1_ID, "node2_id": raw.hits.hits[i]._source.NODE2_ID});
      //console.log(raw.hits.hits[i]._source.DEVICE_TYPE);
    }

    //calculate links
    function cal(from_index, to_id, callback) {
      //console.log(from_index + ' : ' + to_id)

      // in the middle of list, one equitment can be node1_id = node2_id
      for (var i = 0; i < energy.nodes.length; i++) {
        if (energy.nodes[i].node1_id === to_id && energy.nodes[i].node2_id === to_id) {
          energy_2.nodes.push(energy.nodes[i]);
          energy.nodes.splice(i, 1);
          energy_2.links.push({"source": from_index, "target": energy_2.nodes.length-1, "value": 1});
          from_index = energy_2.nodes.length-1;
          break;
        }
      }
      
      
      for (var i = 0; i < energy.nodes.length; i++) {
        if (energy.nodes[i].node1_id === to_id) {
          //don't count some unneccensary items
          if (energy.nodes[i].name.match("站房引线|站房电缆头|站房接地刀闸|10kV电缆")) {
            if (energy.nodes[i].node2_id != '0') {
              callback(from_index, energy.nodes[i].node2_id, callback);
            }
            continue;
          }
          
          //add node
          var flag = false;
          for (var j = 0; j < energy_2.nodes.length; j++) {
            if (energy_2.nodes[j] === energy.nodes[i]) {
              flag = true;
              break;
            }
          }
          if (!flag) {
            energy_2.nodes.push(energy.nodes[i]);
            j = energy_2.nodes.length - 1;
          }
    
          //add link
          energy_2.links.push({"source": from_index, "target": j, "value": 1});
      
          //continue on next node
          if (energy_2.nodes[j].node2_id != '0') {
            callback(j, energy_2.nodes[j].node2_id, callback);
          }
        }
      }
    }

    // find the begining node
    for (var i = 0; i < energy.nodes.length; i++) {
      if (energy.nodes[i].node1_id === id && energy.nodes[i].node2_id === id) {
        energy_2.nodes.push(energy.nodes[i]);
        energy.nodes.splice(i, 1);
        break;
      }
    }
    cal(0, id, cal);

    console.log(JSON.stringify(energy_2));
    res.json(energy_2);
  });
});

router.get('/full', function(req, res) {
  request("http://visualenergytech.com:9200/logstash-wanjiang/_search?size=5000", function (error, response, body) {

    var raw = JSON.parse(body);

    var energy = {
      "nodes":[],
      "links":[]
    };

    //for (var i = 0; i < raw.hits.hits.length; i++) {
    for (var i = 0; i < raw.hits.hits.length; i++) {
      energy.nodes.push({"name": raw.hits.hits[i]._source.DEVICE_TYPE + "(" + raw.hits.hits[i]._source.NODE1_ID + ")", "node1_id": raw.hits.hits[i]._source.NODE1_ID, "node2_id": raw.hits.hits[i]._source.NODE2_ID});
      //console.log(raw.hits.hits[i]._source.DEVICE_TYPE);
    }

    //remove invalid node or standalone node
    var removal = [];
    for (var i = 0; i < energy.nodes.length; i++) {
      if(!energy.nodes[i].node1_id || !energy.nodes[i].node2_id || typeof energy.nodes[i].node1_id === "undefined" || typeof energy.nodes[i].node2_id === "undefined" || energy.nodes[i].node1_id === energy.nodes[i].node2_id || energy.nodes[i].node1_id ==="0" || energy.nodes[i].node2_id ==="0") {
        removal.push(i);
      }
    }
    for (var i = removal.length-1; i >= 0; i--) {
      energy.nodes.splice(removal[i],1);
    }


    //calculate links
    for (var i = 0; i < energy.nodes.length; i++) {
      for (var j = 0; j < energy.nodes.length; j++) {
        if (energy.nodes[i].node2_id === energy.nodes[j].node1_id) {
          energy.links.push({"source": i, "target": j, "value": 1});
        }
        //console.log(i + ' : ' + j);
      }
    }

    console.log(energy.nodes.length + " : " + energy.links.length);
    console.log(JSON.stringify(energy));

    //remove standalone node again
    var removal = [];
    for (var i = 0; i < energy.nodes.length; i++) {
      var flag = false;
      for (var j = 0; j < energy.links.length; j++) {
        if (i === energy.links[j].source || i === energy.links[j].target) flag = true;
      }
      if (!flag) removal.push(i);
    }
    for (var i = removal.length-1; i >= 0; i--) {
      energy.nodes.splice(removal[i],1);
    }

    energy.links=[];
    for (var i = 0; i < energy.nodes.length; i++) {
      for (var j = 0; j < energy.nodes.length; j++) {
        if (energy.nodes[i].node2_id === energy.nodes[j].node1_id) {
          energy.links.push({"source": i, "target": j, "value": 1});
        }
        //console.log(i + ' : ' + j);
      }
    }

    console.log(JSON.stringify(energy));
    console.log(energy.nodes.length + " : " + energy.links.length);

    res.json(energy);
  });
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('API server starts on port ' + port);
