var fs = require('fs'),
    request = require('request');

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Which id do you want to start with? < default: 8979279 > ', (id) => {

  //id = '10512344';
  if (!id) id = "8979279";
  
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
            console.log(energy.nodes[i].id);
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
    fs.writeFile('energy_2.json', JSON.stringify(energy_2), function(){}); 
  });
  
  rl.close();
});
