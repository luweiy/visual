var fs = require('fs'),
    request = require('request');

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

  fs.writeFile('energy.json', JSON.stringify(energy), function(){}); 
});
