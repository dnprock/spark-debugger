function htmlDecode(input){
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

function drawD3Document(data) {
  var data_stack = data.split("\n");
  var stack = [];
  for (var i = 0; i < data_stack.length; i++) {
    if (data_stack[i] !== "") {
      stack.push(htmlDecode(data_stack[i]));
    }
  }
  
  var WIDTH = 800, HEIGHT = 800;
  var data = [];

  var nodes = {};
  
  nodes[stack[0]] = {name: stack[0]};
  for (var i = 1; i < stack.length; i++) {
    var link = {};
    
    if (!nodes[stack[i]]) {
      nodes[stack[i]] = {name: stack[i]};
    }
    
    link.source = nodes[stack[i]];
    link.target = nodes[stack[i - 1]];
    
    data.push(link);
  }

  var width = WIDTH,
      height = HEIGHT;

  var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(data)
      .size([width, height])
      .linkDistance(30)
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
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
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
      .attr("class", "node")
      .call(force.drag);

  // add the nodes
  node.append("circle")
      .attr("r", 5);

  // add the text 
  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name.substring(d.name.length - 30); });

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
}