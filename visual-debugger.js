function htmlDecode(input){
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

function drawD3Document(data) {
  var WIDTH = 1000, HEIGHT = 800;
  var graph_data = [];

  var nodes = [];
  var nodes_map = {};
  
  var data_stack = data.split("\n");
  var prev_node = null;
  var c_stage = -1;
  var stages = [];
  for (var i = 0; i < data_stack.length; i++) {
    if (data_stack[i] !== "") {
      var call_data = htmlDecode(data_stack[i]).split(",");
      
      if (stages.indexOf(call_data[1]) === -1) {
        stages.push(call_data[1]);
      }
      
      if (!nodes_map[call_data[0]]) {
        // new node
        var n = {name: call_data[0], stages: [call_data[1]]};
        nodes.push(n);
        nodes_map[n.name] = n;
      } else {
        nodes_map[call_data[0]].stages.push(call_data[1]);
      }
      
      if (call_data[1] !== c_stage) {
        // stage change, no link
        c_stage = call_data[1];
      } else {
        var link = {};
        
        link.source = nodes_map[call_data[0]];
        link.target = prev_node;

        graph_data.push(link);
      }
      
      prev_node = nodes_map[call_data[0]];
    }
  }

  var width = WIDTH,
      height = HEIGHT;

  var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(graph_data)
      .size([width - 200, height])
      .linkDistance(100)
      .gravity(0.1)
      .charge(-1000)
      .on("tick", tick)
      .start();

  var svg = d3.select("#canvas-svg").append("svg")
      .attr("width", width)
      .attr("height", height);

  // build the arrow.
  svg.append("svg:defs").selectAll("marker")
      .data(["end"])      // Different link/path types can be defined here
    .enter().append("svg:marker")    // This section adds in the arrows
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", -2.5)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

  // add the links and the arrows
  var path = svg.append("svg:g").selectAll("path")
      .data(force.links())
    .enter().append("svg:path")
      .attr("class", "link")
      .attr("marker-end", "url(#end)");

  // define the nodes
  var node = svg.selectAll(".node")
      .data(force.nodes())
    .enter().append("g")
      .attr("class", function(d) {
        var cl = "circle";
        if (d.stages.length > 1) {
          cl = "pie";
        }
        return cl;
      })
      .call(force.drag);

  var color = d3.scale.category20();
  var radius = 20;
  
  // add circle nodes
  d3.selectAll("g.circle").append("circle")
      .attr("r", radius)
      .style("fill", function(d) {
        return color(d.stages[0]);
      });
  
  var arc = d3.svg.arc()
      .outerRadius(radius)
      .innerRadius(0);

  var pie = d3.layout.pie()
      .sort(null)
      .value(function(d) { return 10; });

  // add pie nodes
  d3.selectAll("g.pie").call(function(d) {
    for (var i = 0; i < d[0].length; i++) {
      var pie_arcs = d3.select(d[0][i]).selectAll(".arc")
          .data(pie(d.data()[i].stages))
          .enter().append("g")
          .attr("class", "arc");
      
      pie_arcs.append("path")
          .attr("d", arc)
          .style("fill", function(d) {
            return color(d.data);
          });
    }
  });

  // add the text 
  node.append("text")
      .attr("x", 25)
      .attr("dy", ".35em")
      .text(function(d) {
        return d.name.substring(d.name.indexOf("(") + 1, d.name.indexOf(")"));
      });

  // add the curvy lines
  function tick() {
      path.attr("d", function(d) {
          var dx = d.target.x - d.source.x,
              dy = d.target.y - d.source.y,
              dr = Math.sqrt(dx * dx + dy * dy);
          return "M" + 
              d.source.x + "," + 
              d.source.y + "A" + 
              dr + "," + dr + " 0 0,1 " + 
              d.target.x + "," + 
              d.target.y;
      });

      node
          .attr("transform", function(d) { 
    	    return "translate(" + d.x + "," + d.y + ")"; });
  }
  
  // append legend
  var legend = svg.selectAll(".legend")
      .data(stages).enter()
      .append("g").attr("class", "legend")
      .attr("transform", function(d, i) {
          return "translate(50," + (70 + i * 25) + ")";
      });

  legend.append("rect")
      .attr("x", width - 200)
      .attr("width", 18).attr("height", 18)
      .style("fill", function(d) {
          return color(d);
      });
  legend.append("text").attr("x", width - 210)
      .attr("y", 9).attr("dy", ".35em")
      .style("text-anchor", "end").text(function(d) {
          return "Stage " + d;
      });
}